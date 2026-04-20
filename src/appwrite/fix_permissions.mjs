import { Client, Databases, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function fixPermissions() {
    console.log('🔄 Updating Appwrite Collection Permissions...');

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

    // We grant full CRUD permissions to any logged-in user ("users" role) for the entire project
    // Document Level Security is true by default, meaning users can restrict their own docs,
    // but without collection-level permissions, no one can do anything.
    const permissions = [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
    ];

    try {
        const collectionsList = await databases.listCollections(dbId);
        
        for (const col of collectionsList.collections) {
            console.log(`Updating permissions for ${col.name}...`);
            await databases.updateCollection(dbId, col.$id, col.name, permissions, true);
            console.log(`✅ ${col.name} updated.`);
        }
        console.log('🎉 All collection permissions fixed! Users can now read/write their data.');
    } catch (e) {
        console.error('❌ Failed to update permissions:', e);
    }
}

fixPermissions();
