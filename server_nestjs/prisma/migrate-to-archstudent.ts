/**
 * Migration Script: Convert users with architecture subjects to ARCHSTUDENT role
 *
 * This script identifies users who are registered for architecture-related subjects
 * and migrates them from STUDENT to ARCHSTUDENT role.
 */

import { PrismaClient, GlobalRole } from '@prisma/client';

const prisma = new PrismaClient();

// Liste der Architektur-bezogenen Fächer
const ARCHITECTURE_SUBJECTS = [
  'Architektur',
  'Städtebau',
  'Gebäudeplanung',
  'CAD',
  'Parametric Design',
  'Computational Design',
  'BIM',
  'Digital Architecture',
  'Architectural Design',
  'Urban Planning',
  'Building Design',
  'Rhino',
  'Grasshopper'
];

interface MigrationResult {
  totalUsersChecked: number;
  archStudentsFound: number;
  usersUpdated: number;
  errors: string[];
  migratedUsers: Array<{
    id: number;
    email: string;
    name: string;
    subjects: string[];
  }>;
}

/**
 * Hauptfunktion für die Migration
 */
async function migrateToArchStudent(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalUsersChecked: 0,
    archStudentsFound: 0,
    usersUpdated: 0,
    errors: [],
    migratedUsers: []
  };

  try {
    console.log('🚀 Starting migration to ARCHSTUDENT role...');
    console.log('📋 Architecture subjects to check:', ARCHITECTURE_SUBJECTS);

    // 1. Alle Studenten mit ihren Fächern laden
    const studentsWithSubjects = await prisma.user.findMany({
      where: {
        globalRole: GlobalRole.STUDENT
      },
      include: {
        userSubjects: {
          where: {
            registeredForSL: true
          },
          include: {
            subject: true
          }
        }
      }
    });

    result.totalUsersChecked = studentsWithSubjects.length;
    console.log(`👥 Found ${result.totalUsersChecked} students to check`);

    // 2. Studenten mit Architektur-Fächern identifizieren
    const archStudentCandidates = studentsWithSubjects.filter(user => {
      const userSubjects = user.userSubjects.map(us => us.subject.name);
      return userSubjects.some(subjectName =>
        ARCHITECTURE_SUBJECTS.some(archSubject =>
          subjectName.toLowerCase().includes(archSubject.toLowerCase()) ||
          archSubject.toLowerCase().includes(subjectName.toLowerCase())
        )
      );
    });

    result.archStudentsFound = archStudentCandidates.length;
    console.log(`🏗️ Found ${result.archStudentsFound} users with architecture subjects`);

    // 3. Migration durchführen
    for (const user of archStudentCandidates) {
      try {
        const userSubjects = user.userSubjects.map(us => us.subject.name);

        // User zur neuen Rolle migrieren
        await prisma.user.update({
          where: { id: user.id },
          data: { globalRole: GlobalRole.ARCHSTUDENT }
        });

        result.usersUpdated++;
        result.migratedUsers.push({
          id: user.id,
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
          subjects: userSubjects
        });

        console.log(`✅ Migrated user: ${user.email} (${userSubjects.join(', ')})`);

      } catch (error) {
        const errorMsg = `Failed to migrate user ${user.email}: ${error.message}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // 4. Verifikation
    const verificationCount = await prisma.user.count({
      where: { globalRole: GlobalRole.ARCHSTUDENT }
    });

    console.log('\n📊 Migration Summary:');
    console.log(`   Students checked: ${result.totalUsersChecked}`);
    console.log(`   Architecture students found: ${result.archStudentsFound}`);
    console.log(`   Users successfully migrated: ${result.usersUpdated}`);
    console.log(`   Total ARCHSTUDENT users in DB: ${verificationCount}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🎉 Migration completed successfully!');

    return result;

  } catch (error) {
    console.error('💥 Migration failed:', error);
    result.errors.push(`Critical error: ${error.message}`);
    throw error;
  }
}

/**
 * Rollback-Funktion (falls nötig)
 */
async function rollbackMigration(): Promise<void> {
  console.log('🔄 Rolling back ARCHSTUDENT migration...');

  const archStudents = await prisma.user.findMany({
    where: { globalRole: GlobalRole.ARCHSTUDENT }
  });

  for (const user of archStudents) {
    await prisma.user.update({
      where: { id: user.id },
      data: { globalRole: GlobalRole.STUDENT }
    });
    console.log(`↩️ Rolled back user: ${user.email}`);
  }

  console.log('✅ Rollback completed');
}

/**
 * Dry-Run Funktion (ohne tatsächliche Änderungen)
 */
async function dryRunMigration(): Promise<MigrationResult> {
  console.log('🧪 Running dry migration (no changes will be made)...');

  const result: MigrationResult = {
    totalUsersChecked: 0,
    archStudentsFound: 0,
    usersUpdated: 0,
    errors: [],
    migratedUsers: []
  };

  const studentsWithSubjects = await prisma.user.findMany({
    where: { globalRole: GlobalRole.STUDENT },
    include: {
      userSubjects: {
        where: { registeredForSL: true },
        include: { subject: true }
      }
    }
  });

  result.totalUsersChecked = studentsWithSubjects.length;

  const archStudentCandidates = studentsWithSubjects.filter(user => {
    const userSubjects = user.userSubjects.map(us => us.subject.name);
    return userSubjects.some(subjectName =>
      ARCHITECTURE_SUBJECTS.some(archSubject =>
        subjectName.toLowerCase().includes(archSubject.toLowerCase())
      )
    );
  });

  result.archStudentsFound = archStudentCandidates.length;

  console.log('\n📋 Users that WOULD be migrated:');
  archStudentCandidates.forEach(user => {
    const subjects = user.userSubjects.map(us => us.subject.name);
    console.log(`   - ${user.email}: ${subjects.join(', ')}`);
    result.migratedUsers.push({
      id: user.id,
      email: user.email,
      name: `${user.firstname} ${user.lastname}`,
      subjects
    });
  });

  return result;
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'migrate':
        await migrateToArchStudent();
        break;
      case 'rollback':
        await rollbackMigration();
        break;
      case 'dry-run':
        await dryRunMigration();
        break;
      default:
        console.log('Usage:');
        console.log('  npm run migrate:archstudent dry-run   # Preview changes');
        console.log('  npm run migrate:archstudent migrate   # Execute migration');
        console.log('  npm run migrate:archstudent rollback  # Rollback changes');
        break;
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen wenn direkt aufgerufen
if (require.main === module) {
  main();
}

export { migrateToArchStudent, rollbackMigration, dryRunMigration };
