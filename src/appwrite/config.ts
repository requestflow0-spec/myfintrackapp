import { Client, Account, Databases, ID } from 'appwrite';

export const appwriteConfig = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '',
    collections: {
        userProfiles: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USERPROFILES || '',
        incomes: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_INCOMES || '',
        expenses: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EXPENSES || '',
        savingsAccounts: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SAVINGSACCOUNTS || '',
        debts: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_DEBTS || '',
        transactions: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TRANSACTIONS || '',
        recurringTransactions: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_RECURRINGTRANSACTIONS || '',
    }
};

let client: Client;
let account: Account;
let databases: Databases;

export function initializeAppwrite() {
    if (!client) {
        client = new Client()
            .setEndpoint(appwriteConfig.endpoint)
            .setProject(appwriteConfig.projectId);

        account = new Account(client);
        databases = new Databases(client);
    }

    return { client, account, databases };
}

export { ID };
export const getAppwriteDatabases = () => databases;
