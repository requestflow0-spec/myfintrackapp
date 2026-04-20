import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Helper to wait to avoid rate limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function setupDatabase() {
    console.log('🔄 Setting up Appwrite Database...');

    try {
        // Create Database
        const db = await databases.create('unique()', 'FinTrack_DB');
        const dbId = db.$id;
        console.log(`✅ Database Created: ${dbId}`);

        // Helper to create collection and wait
        async function createCol(name) {
            const col = await databases.createCollection(dbId, 'unique()', name);
            console.log(`✅ Collection Created: ${name} (${col.$id})`);
            return col.$id;
        }

        const collections = {
            userProfiles: await createCol('userProfiles'),
            incomes: await createCol('incomes'),
            expenses: await createCol('expenses'),
            savingsAccounts: await createCol('savingsAccounts'),
            debts: await createCol('debts'),
            transactions: await createCol('transactions'),
            recurringTransactions: await createCol('recurringTransactions'),
        };

        console.log('🔄 Creating Attributes... (this will take a few moments)');

        // We use wait=true, but we still might hit rate limits, so we create sequentially
        async function addString(cId, key, size=256, required=true, isArray=false) {
            await databases.createStringAttribute(dbId, cId, key, size, required, undefined, isArray);
            await sleep(50);
        }
        async function addFloat(cId, key, required=true) {
            await databases.createFloatAttribute(dbId, cId, key, required);
            await sleep(50);
        }
        async function addBoolean(cId, key, required=true) {
            await databases.createBooleanAttribute(dbId, cId, key, required);
            await sleep(50);
        }
        async function addDatetime(cId, key, required=true) {
            await databases.createDatetimeAttribute(dbId, cId, key, required);
            await sleep(50);
        }

        // userProfiles
        await addString(collections.userProfiles, 'userId');
        await addString(collections.userProfiles, 'name');
        await addString(collections.userProfiles, 'description', 256, false);
        await addString(collections.userProfiles, 'currency', 10, false);
        await addString(collections.userProfiles, 'expenseCategories', 100, false, true); // array
        await addDatetime(collections.userProfiles, 'createdAt', false);
        await addDatetime(collections.userProfiles, 'updatedAt', false);

        // incomes
        await addString(collections.incomes, 'profileId');
        await addFloat(collections.incomes, 'amount');
        await addString(collections.incomes, 'date');
        await addString(collections.incomes, 'source');
        await addString(collections.incomes, 'client', 256, false);
        await addString(collections.incomes, 'description', 500, false);
        await addDatetime(collections.incomes, 'createdAt', false);
        await addDatetime(collections.incomes, 'updatedAt', false);

        // expenses
        await addString(collections.expenses, 'profileId');
        await addFloat(collections.expenses, 'amount');
        await addString(collections.expenses, 'date');
        await addString(collections.expenses, 'category');
        await addString(collections.expenses, 'itemService');
        await addString(collections.expenses, 'frequency');
        await addString(collections.expenses, 'modeOfPayment', 100, false);
        await addString(collections.expenses, 'description', 500, false);
        await addDatetime(collections.expenses, 'createdAt', false);
        await addDatetime(collections.expenses, 'updatedAt', false);

        // savingsAccounts
        await addString(collections.savingsAccounts, 'profileId');
        await addString(collections.savingsAccounts, 'name');
        await addString(collections.savingsAccounts, 'type');
        await addFloat(collections.savingsAccounts, 'currentAmount');
        await addFloat(collections.savingsAccounts, 'goalAmount', false);
        await addString(collections.savingsAccounts, 'description', 500, false);
        await addDatetime(collections.savingsAccounts, 'createdAt', false);
        await addDatetime(collections.savingsAccounts, 'updatedAt', false);

        // debts
        await addString(collections.debts, 'profileId');
        await addString(collections.debts, 'name');
        await addString(collections.debts, 'type');
        await addFloat(collections.debts, 'initialAmount');
        await addFloat(collections.debts, 'currentBalance');
        await addFloat(collections.debts, 'interestRate', false);
        await addFloat(collections.debts, 'minimumPayment', false);
        await addString(collections.debts, 'dueDate', 100, false);
        await addString(collections.debts, 'description', 500, false);
        await addDatetime(collections.debts, 'createdAt', false);
        await addDatetime(collections.debts, 'updatedAt', false);

        // transactions
        await addString(collections.transactions, 'profileId');
        await addFloat(collections.transactions, 'amount');
        await addString(collections.transactions, 'date');
        await addString(collections.transactions, 'type');
        await addString(collections.transactions, 'modeOfPayment');
        await addString(collections.transactions, 'category');
        await addString(collections.transactions, 'recipientSender');
        await addString(collections.transactions, 'description', 500, false);
        await addString(collections.transactions, 'incomeId', 100, false);
        await addString(collections.transactions, 'expenseId', 100, false);
        await addString(collections.transactions, 'debtId', 100, false);
        await addDatetime(collections.transactions, 'createdAt', false);
        await addDatetime(collections.transactions, 'updatedAt', false);

        // recurringTransactions
        await addString(collections.recurringTransactions, 'profileId');
        await addString(collections.recurringTransactions, 'type');
        await addFloat(collections.recurringTransactions, 'amount');
        await addString(collections.recurringTransactions, 'category');
        await addString(collections.recurringTransactions, 'description');
        await addString(collections.recurringTransactions, 'frequency');
        await addString(collections.recurringTransactions, 'startDate');
        await addString(collections.recurringTransactions, 'nextDueDate');
        await addString(collections.recurringTransactions, 'lastExecutedDate', 100, false);
        await addBoolean(collections.recurringTransactions, 'isActive');
        await addString(collections.recurringTransactions, 'linkedExpenseId', 100, false);
        await addDatetime(collections.recurringTransactions, 'createdAt', false);
        await addDatetime(collections.recurringTransactions, 'updatedAt', false);

        console.log('🎉 All Attributes Created!');
        
        // Output format for .env insertion
        console.log('\n=============================================');
        console.log('Add the following to your .env file:');
        console.log(`NEXT_PUBLIC_APPWRITE_DATABASE_ID=${dbId}`);
        for (const [key, value] of Object.entries(collections)) {
            console.log(`NEXT_PUBLIC_APPWRITE_COLLECTION_${key.toUpperCase()}=${value}`);
        }
        console.log('=============================================\n');

    } catch (e) {
        console.error('❌ Failed to setup database:', e);
    }
}

setupDatabase();
