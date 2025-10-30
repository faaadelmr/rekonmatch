
export type Row = Record<string, string | number> & {
  __isNotFound?: boolean;
  __isEmpty?: boolean;
  __isDuplicate?: boolean;
};

    