import { ID, Query } from 'appwrite';
import { appwriteConfig, getAppwriteDatabases } from './config';

export function collection(dbDummy: any, ...paths: string[]) {
    const path = paths.join('/');
    const segments = path.split('/');
    const collectionName = segments[segments.length - 1]; 
    const collectionId = (appwriteConfig.collections as any)[collectionName] || '';
    
    return {
        type: 'collection',
        databaseId: appwriteConfig.databaseId,
        collectionId: collectionId,
        path: path
    };
}

export function doc(...args: any[]) {
    if (args.length === 0) {
         return {
            type: 'doc',
            documentId: ID.unique()
         };
    }

    // Handle doc(colRef) or doc(colRef, id)
    if (typeof args[0] === 'object' && args[0].type === 'collection') {
        const colRef = args[0];
        const newId = args[1] || ID.unique();
        return {
            type: 'doc',
            databaseId: colRef.databaseId || appwriteConfig.databaseId,
            collectionId: colRef.collectionId,
            documentId: newId,
            path: `${colRef.path}/${newId}`
        };
    }

    // Handle doc(db, 'path/to/doc')
    if (typeof args[1] === 'string') {
         const path = args.slice(1).join('/'); // If they passed doc(db, 'col', 'doc'), path='col/doc'
         const segments = path.split('/');
         const documentId = segments[segments.length - 1];
         const collectionName = segments[segments.length - 2] || '';
         const collectionId = (appwriteConfig.collections as any)[collectionName] || '';
         return {
            type: 'doc',
            databaseId: appwriteConfig.databaseId,
            collectionId: collectionId,
            documentId: documentId,
            path: path
         };
    }

    return { type: 'doc', documentId: ID.unique() };
}

export function where(field: string, op: string, value: any) {
    return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction?: 'asc' | 'desc') {
    return { type: 'orderBy', field, direction: direction || 'asc' };
}

export function query(colRef: any, ...constraints: any[]) {
    return {
       ...colRef,
       constraints
    };
}

export async function addDoc(colRef: any, data: any) {
    const dbs = getAppwriteDatabases();
    const cleanData = { ...data };
    for (const key of Object.keys(cleanData)) {
        if (cleanData[key]?._isServerTimestamp) cleanData[key] = new Date().toISOString();
        if (cleanData[key] === undefined) delete cleanData[key];
    }
    const doc = await dbs.createDocument(colRef.databaseId, colRef.collectionId, ID.unique(), cleanData);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fintrack-refresh'));
    return { id: doc.$id };
}

export async function updateDoc(docRef: any, data: any) {
    const dbs = getAppwriteDatabases();
    const cleanData = { ...data };
    for (const key of Object.keys(cleanData)) {
        if (cleanData[key]?._isServerTimestamp) cleanData[key] = new Date().toISOString();
        if (cleanData[key]?._isArrayUnion) {
             const existing = await dbs.getDocument(docRef.databaseId, docRef.collectionId, docRef.documentId);
             const arr = existing[key] || [];
             arr.push(...cleanData[key]._isArrayUnion);
             cleanData[key] = arr;
        }
        if (cleanData[key] === undefined) delete cleanData[key];
    }
    await dbs.updateDocument(docRef.databaseId, docRef.collectionId, docRef.documentId, cleanData);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fintrack-refresh'));
}

export async function deleteDoc(docRef: any) {
     const dbs = getAppwriteDatabases();
     await dbs.deleteDocument(docRef.databaseId, docRef.collectionId, docRef.documentId);
     if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fintrack-refresh'));
}

export async function setDoc(docRef: any, data: any, options?: any) {
    const dbs = getAppwriteDatabases();
    const cleanData = { ...data };
    for (const key of Object.keys(cleanData)) {
        if (cleanData[key]?._isServerTimestamp) cleanData[key] = new Date().toISOString();
        if (cleanData[key] === undefined) delete cleanData[key];
    }
    try {
        await dbs.getDocument(docRef.databaseId, docRef.collectionId, docRef.documentId);
        await dbs.updateDocument(docRef.databaseId, docRef.collectionId, docRef.documentId, cleanData);
    } catch {
        await dbs.createDocument(docRef.databaseId, docRef.collectionId, docRef.documentId, cleanData);
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fintrack-refresh'));
}

export async function getDoc(docRef: any) {
    const dbs = getAppwriteDatabases();
    try {
        const res = await dbs.getDocument(docRef.databaseId, docRef.collectionId, docRef.documentId);
        return {
             exists: () => true,
             data: () => res,
             id: res.$id,
             ref: docRef
        };
    } catch {
        return {
             exists: () => false,
             data: () => null,
             id: docRef.documentId,
             ref: docRef
        }
    }
}

export async function getDocs(colRef: any) {
    const dbs = getAppwriteDatabases();
    try {
        const appwriteQueries = [];
        if (colRef.constraints) {
             for (const c of colRef.constraints) {
                  if (c.type === 'orderBy') {
                      if (c.direction === 'desc') appwriteQueries.push(Query.orderDesc(c.field));
                      else appwriteQueries.push(Query.orderAsc(c.field));
                  } else {
                      if (c.op === '==') appwriteQueries.push(Query.equal(c.field, c.value));
                      if (c.op === '<=') appwriteQueries.push(Query.lessThanEqual(c.field, c.value));
                      if (c.op === '>=') appwriteQueries.push(Query.greaterThanEqual(c.field, c.value));
                      if (c.op === '<') appwriteQueries.push(Query.lessThan(c.field, c.value));
                      if (c.op === '>') appwriteQueries.push(Query.greaterThan(c.field, c.value));
                      if (c.op === '!=') appwriteQueries.push(Query.notEqual(c.field, c.value));
                  }
             }
        }
        const res = await dbs.listDocuments(colRef.databaseId, colRef.collectionId, appwriteQueries);
        const docs = res.documents.map(d => ({
             data: () => d,
             id: d.$id,
             ref: {
                 type: 'doc',
                 databaseId: colRef.databaseId,
                 collectionId: colRef.collectionId,
                 documentId: d.$id,
                 path: `${colRef.path}/${d.$id}`
             }
        }));
        return {
            empty: res.total === 0,
            size: res.total,
            docs: docs,
            forEach: (cb: any) => docs.forEach(cb)
        }
    } catch (e) {
        return { empty: true, size: 0, docs: [], forEach: () => {} };
    }
}

export function writeBatch(db: any) {
    const operations: any[] = [];
    return {
         set: (docRef: any, data: any) => { operations.push(() => setDoc(docRef, data)); },
         update: (docRef: any, data: any) => { operations.push(() => updateDoc(docRef, data)); },
         delete: (docRef: any) => { operations.push(() => deleteDoc(docRef)); },
         commit: async () => {
              for (const op of operations) await op();
              if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fintrack-refresh'));
         }
    };
}

export function serverTimestamp() {
    return { _isServerTimestamp: true };
}

export function arrayUnion(...elements: any[]) {
    return { _isArrayUnion: elements };
}

export type Firestore = any;
