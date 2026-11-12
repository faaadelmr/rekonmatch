/* eslint-disable no-restricted-globals */

type SearchOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';

interface SearchCriterion {
  value: string;
  operator: SearchOperator;
}

type Row = Record<string, any>;

interface StoredDataset {
  rows: Row[];
  lowerRows: Record<string, string>[];
  equalsIndexes: Record<string, Map<string, number[]>>;
}

interface DataStreamBuilder {
  safeRows: Row[];
  lowerRows: Record<string, string>[];
}

const datasets: Record<string, StoredDataset> = {};
const streamBuilders: Record<string, DataStreamBuilder> = {};

function sanitizeRow(row: Row): Row {
  const safe: Row = {};
  for (const k in row) {
    const v = row[k];
    safe[k] = typeof v === 'bigint' ? v.toString() : v;
  }
  return safe;
}

function processAndStoreData(type: string, dataRows: Row[]) {
  const safeRows: Row[] = [];
  const lowerRows: Record<string, string>[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const safeRow = sanitizeRow(dataRows[i]);
    safeRows.push(safeRow);

    const lowerRow: Record<string, string> = {};
    for (const col in safeRow) {
      const val = safeRow[col];
      lowerRow[col] = val !== null && val !== undefined ? String(val).toLowerCase() : '';
    }
    lowerRows.push(lowerRow);
  }

  datasets[type] = {
    rows: safeRows,
    lowerRows,
    equalsIndexes: {},
  };
}

const checkMatch = (lowerVal: string, operator: SearchOperator, lowerTerm: string): boolean => {
  if (lowerTerm === '') return false;
  switch (operator) {
    case 'contains': return lowerVal.includes(lowerTerm);
    case 'equals': return lowerVal === lowerTerm;
    case 'startsWith': return lowerVal.startsWith(lowerTerm);
    case 'endsWith': return lowerVal.endsWith(lowerTerm);
    default: return false;
  }
};

self.onmessage = (event: MessageEvent) => {
  const {
    action,
    type,
    datasetType,
    dataRows,
    chunk,
    activeCriteria,
    headers,
    includeEmptyRowsInResults
  } = event.data;

  try {
    // 1. Handle dataset streaming chunks (prevents DataCloneError on large datasets)
    if (action === 'initDataStream' && datasetType) {
      streamBuilders[datasetType] = { safeRows: [], lowerRows: [] };
      return;
    }

    if (action === 'appendDataChunk' && datasetType && Array.isArray(chunk)) {
      const builder = streamBuilders[datasetType];
      if (builder) {
        for (let i = 0; i < chunk.length; i++) {
          const safeRow = sanitizeRow(chunk[i]);
          builder.safeRows.push(safeRow);

          const lowerRow: Record<string, string> = {};
          for (const col in safeRow) {
            const val = safeRow[col];
            lowerRow[col] = val !== null && val !== undefined ? String(val).toLowerCase() : '';
          }
          builder.lowerRows.push(lowerRow);
        }
      }
      return;
    }

    if (action === 'finalizeDataStream' && datasetType) {
      const builder = streamBuilders[datasetType];
      if (builder) {
        datasets[datasetType] = {
          rows: builder.safeRows,
          lowerRows: builder.lowerRows,
          equalsIndexes: {},
        };
        delete streamBuilders[datasetType];
        self.postMessage({ type: 'datasetSynced', datasetType });
      }
      return;
    }

    // 2. Handle direct dataset sync action for small datasets
    if (action === 'setData' && datasetType && Array.isArray(dataRows)) {
      processAndStoreData(datasetType, dataRows);
      self.postMessage({ type: 'datasetSynced', datasetType });
      return;
    }

    // 3. Handle clear dataset action
    if (action === 'clearData') {
      delete datasets.primary;
      delete datasets.secondary;
      delete streamBuilders.primary;
      delete streamBuilders.secondary;
      self.postMessage({ type: 'dataCleared' });
      return;
    }

    // 4. Fallback or initial data caching if dataRows provided in query message
    const targetType = type as string;
    if (Array.isArray(dataRows)) {
      processAndStoreData(targetType, dataRows);
    }

    const stored = datasets[targetType];
    if (!stored || !stored.rows || stored.rows.length === 0) {
      self.postMessage({ type, results: [] });
      return;
    }

    const { rows: currentDataRows, lowerRows } = stored;

    // Pre-lowercase searching terms
    const criteriaValuesByCol = Object.entries(activeCriteria).reduce((acc, [col, crit]) => {
      acc[col] = (crit as SearchCriterion).value.split(/\r\n|\n|\r/).map(t => t.trim().toLowerCase());
      return acc;
    }, {} as Record<string, string[]>);
    
    const maxLen = Math.max(0, ...Object.values(criteriaValuesByCol).map(v => v.length));
    
    const parsedCriteriaByRow: Record<string, string>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const rowCriteria: Record<string, string> = {};
      for (const col of Object.keys(activeCriteria)) {
        rowCriteria[col] = criteriaValuesByCol[col]?.[i];
      }
      parsedCriteriaByRow.push(rowCriteria);
    }

    // Pre-build / reuse index maps of row indices for columns that use 'equals' operator
    const equalsIndexes = stored.equalsIndexes || (stored.equalsIndexes = {});
    Object.entries(activeCriteria).forEach(([col, crit]) => {
      const c = crit as SearchCriterion;
      if (c.operator === 'equals' && !equalsIndexes[col]) {
        const map = new Map<string, number[]>();
        for (let i = 0; i < lowerRows.length; i++) {
          const val = lowerRows[i][col] || '';
          let list = map.get(val);
          if (!list) {
            list = [];
            map.set(val, list);
          }
          list.push(i);
        }
        equalsIndexes[col] = map;
      }
    });

    const finalResults: Row[] = [];
    const processedCriteria = new Set<string>();
    const foundRowIndices = new Set<number>();

    for (const termRow of parsedCriteriaByRow) {
      const termKey = JSON.stringify(Object.entries(termRow).sort());
      const isRowEffectivelyEmpty = Object.values(termRow).every(term => term === '' || term === undefined);

      if (isRowEffectivelyEmpty) {
        if (includeEmptyRowsInResults) {
          finalResults.push({ __isEmpty: true, __searchCriteria: termRow });
        }
        continue;
      }

      if (processedCriteria.has(termKey)) {
        if (includeEmptyRowsInResults) {
          finalResults.push({ __isDuplicate: true, __searchCriteria: termRow });
        }
        continue;
      }
      
      processedCriteria.add(termKey);

      // Find if there is a column using 'equals' that we can use for O(1) initial candidate filtering
      const equalsCol = Object.keys(termRow).find(col => 
        termRow[col] !== '' && termRow[col] !== undefined && (activeCriteria[col] as SearchCriterion)?.operator === 'equals'
      );

      let candidateIndices: number[] | null = null;
      if (equalsCol) {
        const termVal = termRow[equalsCol];
        candidateIndices = equalsIndexes[equalsCol]?.get(termVal) || [];
      }

      const matchIndices: number[] = [];
      const criteriaEntries = Object.entries(termRow).filter(([, term]) => term !== '' && term !== undefined);

      if (candidateIndices !== null) {
        for (let k = 0; k < candidateIndices.length; k++) {
          const idx = candidateIndices[k];
          const lRow = lowerRows[idx];
          let matched = true;
          for (let c = 0; c < criteriaEntries.length; c++) {
            const [col, term] = criteriaEntries[c];
            if (!checkMatch(lRow[col] || '', (activeCriteria[col] as SearchCriterion).operator, term)) {
              matched = false;
              break;
            }
          }
          if (matched) matchIndices.push(idx);
        }
      } else {
        for (let idx = 0; idx < lowerRows.length; idx++) {
          const lRow = lowerRows[idx];
          let matched = true;
          for (let c = 0; c < criteriaEntries.length; c++) {
            const [col, term] = criteriaEntries[c];
            if (!checkMatch(lRow[col] || '', (activeCriteria[col] as SearchCriterion).operator, term)) {
              matched = false;
              break;
            }
          }
          if (matched) matchIndices.push(idx);
        }
      }

      if (matchIndices.length > 0) {
        let newMatchesFound = 0;
        for (let m = 0; m < matchIndices.length; m++) {
          const rowIdx = matchIndices[m];
          if (!foundRowIndices.has(rowIdx)) {
            foundRowIndices.add(rowIdx);
            finalResults.push({ ...currentDataRows[rowIdx], __searchCriteria: termRow });
            newMatchesFound++;
          }
        }

        if (newMatchesFound === 0 && includeEmptyRowsInResults) {
          finalResults.push({ __isDuplicate: true, __searchCriteria: termRow });
        }
      } else {
        const notFoundRow: Row = { __isNotFound: true, __searchCriteria: termRow };
        headers.forEach((header: string) => {
          notFoundRow[header] = termRow[header] || '';
        });
        finalResults.push(notFoundRow);
      }
    }

    self.postMessage({ type, results: finalResults });
  } catch (error: any) {
    self.postMessage({ type, error: error.message || 'Unknown error' });
  }
};
