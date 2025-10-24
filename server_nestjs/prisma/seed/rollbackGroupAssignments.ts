import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Rollback script to restore original group assignments from seedNewProTraTest.ts
 *
 * @description This script resets UserGroupMembership table to the original state
 * created by the seedNewProTraTest.ts seed script. Use this to fix accidental
 * group reassignments made through the UI that break authorization logic.
 *
 * **Original Assignment:**
 * - Team Alpha (Seiltragwerk): student1-4 (Max, Anna, Tom, Lisa)
 * - Team Beta (Bogentragwerk): student5-8 (Paul, Emma, Leon, Mia)
 * - Team Gamma (Rahmensystem): student9-12 (Felix, Sophie, Lukas, Hannah)
 *
 * **Usage:**
 * ```bash
 * cd server_nestjs
 * npx ts-node prisma/seed/rollbackGroupAssignments.ts
 * ```
 */

async function main() {
  console.log('🔄 Rolling back to original group assignments...\n');

  // ==========================================================================
  // STEP 1: Delete all current group memberships
  // ==========================================================================

  console.log('📝 Step 1: Clearing all current group memberships...');
  const deleteResult = await prisma.userGroupMembership.deleteMany({});
  console.log(`  ✅ Deleted ${deleteResult.count} group memberships\n`);

  // ==========================================================================
  // STEP 2: Fetch groups by name
  // ==========================================================================

  console.log('📝 Step 2: Fetching groups...');

  // Try to find groups with extended names first, then fall back to simple names
  let groupA = await prisma.userGroup.findFirst({ where: { name: 'Team Alpha (Seiltragwerk)' } });
  if (!groupA) {
    groupA = await prisma.userGroup.findFirst({ where: { name: 'Team Alpha' } });
  }

  let groupB = await prisma.userGroup.findFirst({ where: { name: 'Team Beta (Bogentragwerk)' } });
  if (!groupB) {
    groupB = await prisma.userGroup.findFirst({ where: { name: 'Team Beta' } });
  }

  let groupC = await prisma.userGroup.findFirst({ where: { name: 'Team Gamma (Rahmensystem)' } });
  if (!groupC) {
    groupC = await prisma.userGroup.findFirst({ where: { name: 'Team Gamma' } });
  }

  if (!groupA || !groupB || !groupC) {
    // Show available groups for debugging
    const allGroups = await prisma.userGroup.findMany({ select: { id: true, name: true } });
    console.error('  ❌ Could not find all required groups!');
    console.error('  📋 Available groups in database:');
    allGroups.forEach(g => console.error(`     - ${g.name} (ID: ${g.id})`));
    throw new Error('\n❌ Groups not found! Check that seed script was run and group names are correct.');
  }

  console.log(`  ✅ Found Team Alpha: "${groupA.name}" (ID: ${groupA.id})`);
  console.log(`  ✅ Found Team Beta: "${groupB.name}" (ID: ${groupB.id})`);
  console.log(`  ✅ Found Team Gamma: "${groupC.name}" (ID: ${groupC.id})\n`);

  // ==========================================================================
  // STEP 3: Fetch all students by email
  // ==========================================================================

  console.log('📝 Step 3: Fetching student accounts...');
  const students = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'student1@test.de', 'student2@test.de', 'student3@test.de', 'student4@test.de',
          'student5@test.de', 'student6@test.de', 'student7@test.de', 'student8@test.de',
          'student9@test.de', 'student10@test.de', 'student11@test.de', 'student12@test.de',
        ],
      },
    },
  });

  if (students.length !== 12) {
    throw new Error(`❌ Expected 12 students, found ${students.length}. Check that seed script was run.`);
  }

  // Create email -> userId mapping
  const studentMap = new Map(students.map(s => [s.email, s.id]));
  console.log(`  ✅ Found all 12 students\n`);

  // ==========================================================================
  // STEP 4: Restore Team Alpha (student1-4)
  // ==========================================================================

  console.log('📝 Step 4: Restoring Team Alpha...');
  const groupAMembers = [
    { userId: studentMap.get('student1@test.de')!, groupId: groupA.id },
    { userId: studentMap.get('student2@test.de')!, groupId: groupA.id },
    { userId: studentMap.get('student3@test.de')!, groupId: groupA.id },
    { userId: studentMap.get('student4@test.de')!, groupId: groupA.id },
  ];

  await prisma.userGroupMembership.createMany({
    data: groupAMembers,
  });

  console.log(`  ✅ Team Alpha restored:`);
  console.log(`     - Student 1 (Max Mustermann)`);
  console.log(`     - Student 2 (Anna Schmidt)`);
  console.log(`     - Student 3 (Tom Weber)`);
  console.log(`     - Student 4 (Lisa Fischer)\n`);

  // ==========================================================================
  // STEP 5: Restore Team Beta (student5-8)
  // ==========================================================================

  console.log('📝 Step 5: Restoring Team Beta...');
  const groupBMembers = [
    { userId: studentMap.get('student5@test.de')!, groupId: groupB.id },
    { userId: studentMap.get('student6@test.de')!, groupId: groupB.id },
    { userId: studentMap.get('student7@test.de')!, groupId: groupB.id },
    { userId: studentMap.get('student8@test.de')!, groupId: groupB.id },
  ];

  await prisma.userGroupMembership.createMany({
    data: groupBMembers,
  });

  console.log(`  ✅ Team Beta restored:`);
  console.log(`     - Student 5 (Paul Wagner)`);
  console.log(`     - Student 6 (Emma Bauer)`);
  console.log(`     - Student 7 (Leon Hoffmann)`);
  console.log(`     - Student 8 (Mia Schäfer)\n`);

  // ==========================================================================
  // STEP 6: Restore Team Gamma (student9-12)
  // ==========================================================================

  console.log('📝 Step 6: Restoring Team Gamma...');
  const groupCMembers = [
    { userId: studentMap.get('student9@test.de')!, groupId: groupC.id },
    { userId: studentMap.get('student10@test.de')!, groupId: groupC.id },
    { userId: studentMap.get('student11@test.de')!, groupId: groupC.id },
    { userId: studentMap.get('student12@test.de')!, groupId: groupC.id },
  ];

  await prisma.userGroupMembership.createMany({
    data: groupCMembers,
  });

  console.log(`  ✅ Team Gamma restored:`);
  console.log(`     - Student 9 (Felix Koch)`);
  console.log(`     - Student 10 (Sophie Meyer)`);
  console.log(`     - Student 11 (Lukas Richter)`);
  console.log(`     - Student 12 (Hannah Schneider)\n`);

  // ==========================================================================
  // STEP 7: Verification
  // ==========================================================================

  console.log('📝 Step 7: Verifying restoration...');
  const totalMemberships = await prisma.userGroupMembership.count();

  if (totalMemberships !== 12) {
    throw new Error(`❌ Expected 12 memberships, found ${totalMemberships}`);
  }

  console.log(`  ✅ Verified: 12 group memberships restored\n`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Group assignments successfully rolled back!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 Restored Structure:');
  console.log('  • Team Alpha: 4 members (student1-4)');
  console.log('  • Team Beta:  4 members (student5-8)');
  console.log('  • Team Gamma: 4 members (student9-12)\n');

  console.log('✅ Next Steps:');
  console.log('  1. Reload your frontend (Ctrl+Shift+R)');
  console.log('  2. Login with student1@test.de / student123');
  console.log('  3. Navigate to Lecturer View → Gruppenaufteilung');
  console.log('  4. Verify that students 1-4 are in Team Alpha');
  console.log('  5. Test forum access to verify authorization works\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// EXECUTE ROLLBACK
// ============================================================================

main()
  .catch((e) => {
    console.error('\n❌ Rollback failed:', e);
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Check that seedNewProTraTest.ts was run');
    console.error('  2. Verify group names: Team Alpha (Seiltragwerk), Team Beta (Bogentragwerk), Team Gamma (Rahmensystem)');
    console.error('  3. Verify student emails: student1@test.de - student12@test.de');
    console.error('  4. Check database connection\n');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
