// Upgrade stored notes to the current schema on service-worker startup.
// Idempotent: once notes are at the current version, this is a no-op read.
UserLocalStorage.migrateNotes().catch((error) => {
    console.warn('Note migration failed.', error);
});
