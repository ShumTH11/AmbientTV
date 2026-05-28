package com.ambienttv.data.local.database

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Room migrations for AmbientTV database.
 *
 * Keeps user data (favorites, history) intact across app updates.
 */
object Migrations {

    /**
     * Migration from v1 to v2: adds the `favorites` table.
     */
    val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS favorites (
                    pairId TEXT PRIMARY KEY NOT NULL,
                    videoId TEXT NOT NULL,
                    audioId TEXT NOT NULL,
                    addedAt INTEGER NOT NULL DEFAULT 0
                )
                """.trimIndent()
            )
        }
    }

    /**
     * Migration from v2 to v3: adds the `history` table.
     */
    val MIGRATION_2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS history (
                    pairId TEXT PRIMARY KEY NOT NULL,
                    videoId TEXT NOT NULL,
                    audioId TEXT NOT NULL,
                    playedAt INTEGER NOT NULL DEFAULT 0,
                    progressMs INTEGER NOT NULL DEFAULT 0,
                    durationMs INTEGER NOT NULL DEFAULT 0
                )
                """.trimIndent()
            )
        }
    }
}
