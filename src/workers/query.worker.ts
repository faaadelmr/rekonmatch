/* eslint-disable no-restricted-globals */

type SearchOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';

interface SearchCriterion {
  value: string;
  operator: SearchOperator;
}

type Row = Record<string, any>;

const checkMatch = (value: any, operator: SearchOperator, lowerTerm: string): boolean => {
  if (lowerTerm === '') return false;
  const val = String(value ?? '').toLowerCase();
  switch (operator) {
    case 'contains': return val.includes(lowerTerm);
    case 'equals': return val === lowerTerm;
    case 'startsWith': return val.startsWith(lowerTerm);
    case 'endsWith': return val.endsWith(lowerTerm);
    default: return false;
  }
};

self.onmessage = (event: MessageEvent) => {
  const {
    type,
    dataRows,
    activeCriteria,
    headers,
    includeEmptyRowsInResults
  } = event.data;

  try {
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

    // Pre-build index maps for columns that use 'equals' operator to speed up matching
    const equalsIndexes: Record<string, Map<string, Row[]>> = {};
    Object.entries(activeCriteria).forEach(([col, crit]) => {
      const c = crit as SearchCriterion;
      if (c.operator === 'equals') {
        const map = new Map<string, Row[]>();
        dataRows.forEach((row: Row) => {
          const val = String(row[col] ?? '').toLowerCase();
          if (!map.has(val)) {
            map.set(val, []);
          }
          map.get(val)!.push(row);
        });
        equalsIndexes[col] = map;
      }
    });

    const finalResults: Row[] = [];
    const processedCriteria = new Set<string>();
    const foundRowsTracker = new Set<string>();

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
          finalResults.push({ __isEmpty: true, __searchCriteria: termRow });
        }
        continue;
      }
      
      processedCriteria.add(termKey);

      // Find if there is a column using 'equals' that we can use for O(1) initial filtering
      const equalsCol = Object.keys(termRow).find(col => 
        termRow[col] !== '' && termRow[col] !== undefined && (activeCriteria[col] as SearchCriterion)?.operator === 'equals'
      );

      let candidates = dataRows;
      if (equalsCol) {
        const termVal = termRow[equalsCol];
        candidates = equalsIndexes[equalsCol].get(termVal) || [];
      }

      const foundMatches = candidates.filter((dataRow: Row) => 
        Object.entries(termRow).every(([col, term]) => {
          if (term === '' || term === undefined) return true;
          return checkMatch(dataRow[col], (activeCriteria[col] as SearchCriterion).operator, term);
        })
      );

      if (foundMatches.length > 0) {
        let newMatchesFound = 0;
        foundMatches.forEach((match: Row) => {
          const uniqueKey = JSON.stringify(match);
          if (!foundRowsTracker.has(uniqueKey)) {
            foundRowsTracker.add(uniqueKey);
            finalResults.push({ ...match, __searchCriteria: termRow });
            newMatchesFound++;
          }
        });

        if (newMatchesFound === 0 && includeEmptyRowsInResults) {
          finalResults.push({ __isEmpty: true, __searchCriteria: termRow });
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
