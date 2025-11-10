
export type Row = Record<string, string | number | boolean | Record<string, string> | bigint> & {
  __isNotFound?: boolean;
  __isEmpty?: boolean;
  __isDuplicate?: boolean;
  __searchCriteria?: Record<string, string>;
};

    