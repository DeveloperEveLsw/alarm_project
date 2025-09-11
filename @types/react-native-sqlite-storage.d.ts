declare module 'react-native-sqlite-storage' {
  import { SQLiteDatabase } from 'react-native-sqlite-storage';

  export function openDatabase(
    params: { name: string; location: string },
    success?: () => void,
    error?: (err: any) => void
  ): SQLiteDatabase;

  export function enablePromise(enable: boolean): void;

  export interface SQLiteDatabase {
    executeSql: (
      sqlStatement: string,
      args?: any[]
    ) => Promise<[ResultSet]>;
    close: () => Promise<void>;
  }

  export interface ResultSet {
    rows: {
      length: number;
      item: (index: number) => any;
    };
  }
}