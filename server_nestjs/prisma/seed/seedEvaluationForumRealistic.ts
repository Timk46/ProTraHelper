import { PrismaClient } from '@prisma/client';
import { EvaluationPhase, EvaluationStatus, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedEvaluationForumRealistic() {
  console.log('🚀 Starting realistic evaluation forum seeding...');

  try {
    // 1. Check for required dependencies first
    const subjectArchitecture = await prisma.subject.findFirst({
      where: { name: 'Tragkonstruktion 3' },
    });

    if (!subjectArchitecture) {
      throw new Error('Subject "Tragkonstruktion 3" not found. Please run basic seeding first.');
    }

    console.log('✅ Dependencies verified');

    // 2. Create 25 students in 5 groups with realistic German names
    const studentGroups = [
      // Group 1
      [
        { email: 'max.mueller@uni-siegen.de', firstname: 'Max', lastname: 'Mueller' },
        { email: 'anna.schmidt@uni-siegen.de', firstname: 'Anna', lastname: 'Schmidt' },
        { email: 'lisa.weber@uni-siegen.de', firstname: 'Lisa', lastname: 'Weber' },
        { email: 'tom.wagner@uni-siegen.de', firstname: 'Tom', lastname: 'Wagner' },
        { email: 'julia.becker@uni-siegen.de', firstname: 'Julia', lastname: 'Becker' },
      ],
      // Group 2
      [
        { email: 'david.schulz@uni-siegen.de', firstname: 'David', lastname: 'Schulz' },
        { email: 'sarah.fischer@uni-siegen.de', firstname: 'Sarah', lastname: 'Fischer' },
        { email: 'michael.meyer@uni-siegen.de', firstname: 'Michael', lastname: 'Meyer' },
        { email: 'nina.hoffmann@uni-siegen.de', firstname: 'Nina', lastname: 'Hoffmann' },
        { email: 'jan.richter@uni-siegen.de', firstname: 'Jan', lastname: 'Richter' },
      ],
      // Group 3
      [
        { email: 'katrin.klein@uni-siegen.de', firstname: 'Katrin', lastname: 'Klein' },
        { email: 'felix.wolf@uni-siegen.de', firstname: 'Felix', lastname: 'Wolf' },
        { email: 'marie.schroeder@uni-siegen.de', firstname: 'Marie', lastname: 'Schroeder' },
        { email: 'lukas.neumann@uni-siegen.de', firstname: 'Lukas', lastname: 'Neumann' },
        { email: 'sophie.braun@uni-siegen.de', firstname: 'Sophie', lastname: 'Braun' },
      ],
      // Group 4
      [
        { email: 'alex.zimmermann@uni-siegen.de', firstname: 'Alexander', lastname: 'Zimmermann' },
        { email: 'lena.hartmann@uni-siegen.de', firstname: 'Lena', lastname: 'Hartmann' },
        { email: 'jonas.krueger@uni-siegen.de', firstname: 'Jonas', lastname: 'Krueger' },
        { email: 'emma.lang@uni-siegen.de', firstname: 'Emma', lastname: 'Lang' },
        { email: 'paul.schmitt@uni-siegen.de', firstname: 'Paul', lastname: 'Schmitt' },
      ],
      // Group 5
      [
        { email: 'mia.bergmann@uni-siegen.de', firstname: 'Mia', lastname: 'Bergmann' },
        { email: 'leon.albrecht@uni-siegen.de', firstname: 'Leon', lastname: 'Albrecht' },
        { email: 'clara.koch@uni-siegen.de', firstname: 'Clara', lastname: 'Koch' },
        { email: 'tim.bauer@uni-siegen.de', firstname: 'Tim', lastname: 'Bauer' },
        { email: 'nora.peters@uni-siegen.de', firstname: 'Nora', lastname: 'Peters' },
      ],
    ];

    const allStudents = [];
    let studentCounter = 1;

    for (let groupIndex = 0; groupIndex < studentGroups.length; groupIndex++) {
      const group = studentGroups[groupIndex];
      for (const studentData of group) {
        const student = await prisma.user.upsert({
          where: { email: studentData.email },
          update: {},
          create: {
            email: studentData.email,
            firstname: studentData.firstname,
            lastname: studentData.lastname,
            password: await bcrypt.hash('password123', 10),
            globalRole: GlobalRole.STUDENT,
          },
        });

        // Create UserSubject relationship
        await prisma.userSubject.upsert({
          where: {
            userId_subjectId: {
              userId: student.id,
              subjectId: subjectArchitecture.id,
            },
          },
          update: {},
          create: {
            userId: student.id,
            subjectId: subjectArchitecture.id,
            subjectSpecificRole: 'STUDENT',
            registeredForSL: true,
          },
        });

        allStudents.push({ ...student, groupIndex, studentCounter });
        studentCounter++;
      }
    }

    console.log(`✅ Created ${allStudents.length} students in ${studentGroups.length} groups`);

    // 3. Create 3 lecturers
    const lecturers = [
      {
        email: 'prof.lehmann@uni-siegen.de',
        firstname: 'Prof. Dr.',
        lastname: 'Lehmann',
        subject: 'Tragkonstruktion',
      },
      {
        email: 'prof.mueller@uni-siegen.de',
        firstname: 'Prof. Dr.',
        lastname: 'Mueller',
        subject: 'Baukonstruktion',
      },
      {
        email: 'dr.schmidt@uni-siegen.de',
        firstname: 'Dr.',
        lastname: 'Schmidt',
        subject: 'Statik',
      },
    ];

    const createdLecturers = [];
    for (const lecturerData of lecturers) {
      const lecturer = await prisma.user.upsert({
        where: { email: lecturerData.email },
        update: {},
        create: {
          email: lecturerData.email,
          firstname: lecturerData.firstname,
          lastname: lecturerData.lastname,
          password: await bcrypt.hash('password123', 10),
          globalRole: GlobalRole.TEACHER,
        },
      });

      // Create UserSubject relationship
      await prisma.userSubject.upsert({
        where: {
          userId_subjectId: {
            userId: lecturer.id,
            subjectId: subjectArchitecture.id,
          },
        },
        update: {},
        create: {
          userId: lecturer.id,
          subjectId: subjectArchitecture.id,
          subjectSpecificRole: 'TEACHER',
          registeredForSL: true,
        },
      });

      createdLecturers.push(lecturer);
    }

    console.log('✅ Created 3 lecturers with proper relationships');

    // 4. Create test module
    const testModule = await prisma.module.upsert({
      where: { name: 'Tragkonstruktion 3' },
      update: {},
      create: {
        name: 'Tragkonstruktion 3',
        description: 'Grundlagen der Baukonstruktion mit Fokus auf stabile Rahmenkonstruktionen',
      },
    });

    console.log('✅ Test module created/verified');

    // 5. Create 6 PDF files for submissions
    const pdfFiles = [];
    const pdfFileNames = [
      'stabile-rahmenkonstruktion-modern.pdf',
      'nachhaltige-konstruktion-holz.pdf',
      'innovative-stahlkonstruktion.pdf',
      'hybrid-baukonstruktion.pdf',
      'kostenoptimierte-rahmenkonstruktion.pdf',
      'experimentelle-konstruktionsloesung.pdf',
    ];

    for (let i = 0; i < pdfFileNames.length; i++) {
      const pdfFile = await prisma.file.upsert({
        where: { uniqueIdentifier: `eval-pdf-realistic-${String(i + 1).padStart(3, '0')}` },
        update: {},
        create: {
          uniqueIdentifier: `eval-pdf-realistic-${String(i + 1).padStart(3, '0')}`,
          name: pdfFileNames[i],
          path: `/uploads/evaluation/eval-pdf-realistic-${String(i + 1).padStart(3, '0')}.pdf`,
          type: 'application/pdf',
        },
      });
      pdfFiles.push(pdfFile);
    }

    console.log('✅ Created 6 PDF files for submissions');

    // 6. Create evaluation session
    const evaluationSession = await prisma.evaluationSession.upsert({
      where: { id: 2000 }, // Different ID to avoid conflicts
      update: {},
      create: {
        id: 2000,
        title: 'Peer-Review: Innovative Tragkonstruktionen WS2024',
        description: 'Umfassende Peer-Review Sitzung für eingereichte Entwürfe zu innovativen Tragkonstruktionen',
        moduleId: testModule.id,
        createdById: createdLecturers[0].id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-02-28'),
        phase: EvaluationPhase.DISCUSSION,
        isAnonymous: true,
        isActive: true,
      },
    });

    console.log('✅ Evaluation session created');

    // 7. Create evaluation categories
    const categories = [
      {
        name: 'Vollständigkeit',
        displayName: 'Vollständigkeit',
        description: 'Vollständigkeit der Konstruktionselemente und Dokumentation',
        order: 1,
      },
      {
        name: 'Grafische Darstellungsqualität',
        displayName: 'Grafische Darstellungsqualität',
        description: 'Qualität der technischen Zeichnungen und Visualisierungen',
        order: 2,
      },
      {
        name: 'Vergleichbarkeit',
        displayName: 'Vergleichbarkeit',
        description: 'Vergleichbarkeit mit anderen Lösungsansätzen',
        order: 3,
      },
      {
        name: 'Komplexität',
        displayName: 'Komplexität',
        description: 'Angemessene Komplexität der Konstruktionslösung',
        order: 4,
      },
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const category = await prisma.evaluationCategory.upsert({
        where: {
          sessionId_name: {
            sessionId: evaluationSession.id,
            name: categoryData.name,
          },
        },
        update: {},
        create: {
          sessionId: evaluationSession.id,
          name: categoryData.name,
          displayName: categoryData.displayName,
          description: categoryData.description,
          order: categoryData.order,
        },
      });
      createdCategories.push(category);
    }

    console.log('✅ Evaluation categories created');

    // 8. Create 6 submissions (one from each group + one extra)
    const submissionData = [
      {
        id: 'realistic-submission-001',
        title: 'Moderne Stahl-Holz-Hybridkonstruktion',
        description: 'Innovative Kombination aus Stahl und Holz für nachhaltige und stabile Rahmenkonstruktionen mit optimierter Tragfähigkeit.',
        authorId: allStudents[0].id, // Max Mueller (Group 1)
        pdfFileId: pdfFiles[0].id,
        submittedAt: new Date('2024-01-18'),
      },
      {
        id: 'realistic-submission-002',
        title: 'Nachhaltiger CLT-Rahmenbau',
        description: 'Vollständig aus Cross-Laminated Timber gefertigte Rahmenkonstruktion mit minimaler CO2-Bilanz und hoher Stabilität.',
        authorId: allStudents[7].id, // Michael Meyer (Group 2)
        pdfFileId: pdfFiles[1].id,
        submittedAt: new Date('2024-01-19'),
      },
      {
        id: 'realistic-submission-003',
        title: 'Parametrische Stahlkonstruktion',
        description: 'Durch algorithmische Optimierung entwickelte Stahlrahmenkonstruktion mit maximaler Materialeffizienz.',
        authorId: allStudents[12].id, // Marie Schroeder (Group 3)
        pdfFileId: pdfFiles[2].id,
        submittedAt: new Date('2024-01-20'),
      },
      {
        id: 'realistic-submission-004',
        title: 'Modulare Hybrid-Bauweise',
        description: 'Vorfabrizierte Module in Hybridbauweise für schnelle Montage und flexible Raumaufteilung.',
        authorId: allStudents[17].id, // Jonas Krueger (Group 4)
        pdfFileId: pdfFiles[3].id,
        submittedAt: new Date('2024-01-21'),
      },
      {
        id: 'realistic-submission-005',
        title: 'Kostenoptimierte Standardkonstruktion',
        description: 'Bewährte Konstruktionsprinzipien mit Fokus auf Kosteneffizienz und einfache Bauausführung.',
        authorId: allStudents[22].id, // Clara Koch (Group 5)
        pdfFileId: pdfFiles[4].id,
        submittedAt: new Date('2024-01-22'),
      },
      {
        id: 'realistic-submission-006',
        title: 'Experimenteller Tensegrity-Ansatz',
        description: 'Experimentelle Konstruktion basierend auf Tensegrity-Prinzipien für minimalen Materialverbrauch.',
        authorId: allStudents[4].id, // Julia Becker (Group 1)
        pdfFileId: pdfFiles[5].id,
        submittedAt: new Date('2024-01-23'),
      },
    ];

    const createdSubmissions = [];
    for (const submission of submissionData) {
      const createdSubmission = await prisma.evaluationSubmission.upsert({
        where: { id: submission.id },
        update: {},
        create: {
          id: submission.id,
          title: submission.title,
          description: submission.description,
          authorId: submission.authorId,
          pdfFileId: submission.pdfFileId,
          sessionId: evaluationSession.id,
          status: EvaluationStatus.SUBMITTED,
          phase: EvaluationPhase.DISCUSSION,
          submittedAt: submission.submittedAt,
        },
      });
      createdSubmissions.push(createdSubmission);
    }

    console.log('✅ Created 6 realistic submissions');

    // 9. Create peer review assignment matrix
    // Each submission gets reviewed by 5 students from different groups
    const reviewAssignments = [
      { submissionIndex: 0, reviewerIndices: [5, 6, 10, 11, 15, 16] }, // Group 2,3,4 review submission 1
      { submissionIndex: 1, reviewerIndices: [0, 1, 10, 11, 20, 21] }, // Group 1,3,5 review submission 2
      { submissionIndex: 2, reviewerIndices: [0, 1, 5, 6, 20, 21] },  // Group 1,2,5 review submission 3
      { submissionIndex: 3, reviewerIndices: [5, 6, 10, 11, 20, 21] }, // Group 2,3,5 review submission 4
      { submissionIndex: 4, reviewerIndices: [0, 1, 10, 11, 15, 16] }, // Group 1,3,4 review submission 5
      { submissionIndex: 5, reviewerIndices: [5, 6, 15, 16, 20, 21] }, // Group 2,4,5 review submission 6
    ];

    console.log('✅ Peer review assignments matrix created');

    // 10. Create realistic comments (5-6 per submission, distributed across categories)
    const commentTemplates = [
      {
        type: 'constructive_criticism',
        templates: [
          'Die statischen Berechnungen sind nachvollziehbar, jedoch fehlen Angaben zu den Windlasten.',
          'Die Detailausführung der Knotenpunkte könnte präziser dargestellt werden.',
          'Die gewählten Materialstärken erscheinen für die angegebenen Lasten etwas überdimensioniert.',
          'Die Fundamentierung ist nicht ausreichend dokumentiert.',
          'Die Verbindungselemente sind nicht vollständig spezifiziert.',
        ],
      },
      {
        type: 'positive_feedback',
        templates: [
          'Sehr durchdachte Lösung mit innovativem Ansatz zur Lastverteilung.',
          'Die grafische Darstellung ist übersichtlich und professionell.',
          'Ausgezeichnete Balance zwischen Stabilität und Materialeffizienz.',
          'Die Konstruktion berücksichtigt moderne Nachhaltigkeitsaspekte sehr gut.',
          'Kreative Lösung mit praktischem Bezug zur Bauausführung.',
        ],
      },
      {
        type: 'technical_question',
        templates: [
          'Wie wurde die Knicksicherheit der Stützen nachgewiesen?',
          'Welche Toleranzen sind bei der Montage zu beachten?',
          'Wie verhält sich die Konstruktion bei Temperaturschwankungen?',
          'Wurde eine Schwingungsanalyse durchgeführt?',
          'Welche Wartungsintervalle sind für die Verbindungen vorgesehen?',
        ],
      },
      {
        type: 'improvement_suggestion',
        templates: [
          'Eine zusätzliche Aussteifung in der Horizontalebene würde die Stabilität erhöhen.',
          'Die Verwendung von Hohlprofilen könnte das Eigengewicht reduzieren.',
          'Ein modularer Aufbau würde die Montage vereinfachen.',
          'Die Integration von Installationsschächten sollte berücksichtigt werden.',
          'Eine Optimierung der Bauteilgeometrie könnte Material sparen.',
        ],
      },
      {
        type: 'lecturer_feedback',
        templates: [
          'Solide Arbeit, die alle Grundanforderungen erfüllt. Die Präsentation könnte detaillierter sein.',
          'Innovative Herangehensweise, aber die praktische Umsetzbarkeit ist zu hinterfragen.',
          'Methodisch korrekt durchgeführt, jedoch fehlt eine kritische Bewertung der gewählten Lösung.',
          'Ausgezeichnete Dokumentation, die als Referenz für andere dienen kann.',
          'Der gewählte Ansatz zeigt tiefes Verständnis der Tragwerkslehre.',
        ],
      },
    ];

    const allComments = [];
    let commentIdCounter = 1;

    for (let submissionIndex = 0; submissionIndex < createdSubmissions.length; submissionIndex++) {
      const submission = createdSubmissions[submissionIndex];
      const reviewers = reviewAssignments[submissionIndex].reviewerIndices;
      
      // Create 5-6 comments per submission
      const commentsForSubmission = Math.floor(Math.random() * 2) + 5; // 5 or 6 comments
      
      for (let commentIndex = 0; commentIndex < commentsForSubmission; commentIndex++) {
        let reviewerIndex, commentType, content, anonymousName;
        
        // Last comment is always from a lecturer
        if (commentIndex === commentsForSubmission - 1) {
          const lecturer = createdLecturers[Math.floor(Math.random() * createdLecturers.length)];
          reviewerIndex = lecturer.id;
          commentType = commentTemplates[4]; // lecturer_feedback
          content = commentType.templates[Math.floor(Math.random() * commentType.templates.length)];
          anonymousName = 'Dozent';
        } else {
          // Student comments
          const studentIndex = reviewers[commentIndex % reviewers.length];
          reviewerIndex = allStudents[studentIndex].id;
          
          const typeIndex = Math.floor(Math.random() * 4); // 0-3 for student comment types
          commentType = commentTemplates[typeIndex];
          content = commentType.templates[Math.floor(Math.random() * commentType.templates.length)];
          anonymousName = `Student ${allStudents[studentIndex].firstname}`;
        }

        const categoryIndex = Math.floor(Math.random() * createdCategories.length);
        
        // Generate realistic vote counts based on content type
        let upvotes, downvotes;
        if (commentType.type === 'positive_feedback' || commentType.type === 'lecturer_feedback') {
          upvotes = Math.floor(Math.random() * 4) + 2; // 2-5 upvotes
          downvotes = Math.floor(Math.random() * 2); // 0-1 downvotes
        } else if (commentType.type === 'constructive_criticism') {
          upvotes = Math.floor(Math.random() * 3) + 1; // 1-3 upvotes
          downvotes = Math.floor(Math.random() * 2); // 0-1 downvotes
        } else {
          upvotes = Math.floor(Math.random() * 3) + 1; // 1-3 upvotes
          downvotes = Math.floor(Math.random() * 3); // 0-2 downvotes
        }

        // Create realistic voteDetails JSON with actual user votes
        const voteDetails = { userVotes: {} };
        const totalVotes = upvotes + downvotes;
        const votersPool = allStudents.slice(0, Math.min(totalVotes, 10)); // Max 10 voters
        
        for (let i = 0; i < Math.min(totalVotes, votersPool.length); i++) {
          const voter = votersPool[i];
          const voteType = i < upvotes ? 'upvote' : 'downvote';
          voteDetails.userVotes[voter.id.toString()] = voteType;
        }

        const comment = {
          id: `realistic-comment-${String(commentIdCounter).padStart(3, '0')}`,
          submissionId: submission.id,
          categoryId: createdCategories[categoryIndex].id,
          userId: reviewerIndex,
          content: content,
          voteDetails: voteDetails,
          upvotes: upvotes,
          downvotes: downvotes,
          anonymousDisplayName: anonymousName,
        };

        allComments.push(comment);
        commentIdCounter++;
      }
    }

    // Insert all comments
    for (const comment of allComments) {
      const existingComment = await prisma.evaluationComment.findUnique({
        where: { id: comment.id },
      });

      if (!existingComment) {
        await prisma.evaluationComment.create({
          data: comment,
        });
      }
    }

    console.log(`✅ Created ${allComments.length} realistic comments with voting patterns`);

    // 11. Create comprehensive ratings
    const allRatings = [];
    
    for (let submissionIndex = 0; submissionIndex < createdSubmissions.length; submissionIndex++) {
      const submission = createdSubmissions[submissionIndex];
      const reviewers = reviewAssignments[submissionIndex].reviewerIndices;
      
      // Each reviewer rates all categories for their assigned submissions
      for (const reviewerIndex of reviewers) {
        for (const category of createdCategories) {
          // Generate realistic ratings (5-9 scale with tendency towards 6-8)
          const baseRating = 6 + Math.floor(Math.random() * 3); // 6, 7, or 8
          const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          const finalRating = Math.max(5, Math.min(9, baseRating + variation));
          
          const rating = {
            submissionId: submission.id,
            categoryId: category.id,
            userId: allStudents[reviewerIndex].id,
            rating: finalRating,
          };
          
          allRatings.push(rating);
        }
      }
      
      // Add lecturer ratings for each submission
      const mainLecturer = createdLecturers[0];
      for (const category of createdCategories) {
        const lecturerRating = 6 + Math.floor(Math.random() * 3); // 6-8 range
        
        const rating = {
          submissionId: submission.id,
          categoryId: category.id,
          userId: mainLecturer.id,
          rating: lecturerRating,
        };
        
        allRatings.push(rating);
      }
    }

    // Insert all ratings
    for (const rating of allRatings) {
      await prisma.evaluationRating.upsert({
        where: {
          submissionId_categoryId_userId: {
            submissionId: rating.submissionId,
            categoryId: rating.categoryId,
            userId: rating.userId,
          },
        },
        update: {},
        create: rating,
      });
    }

    console.log(`✅ Created ${allRatings.length} comprehensive ratings`);

    // 12. Output comprehensive test information
    console.log('\n📋 REALISTISCHE FORUM SIMULATION - TEST INFORMATIONEN');
    console.log('=====================================================');
    console.log(`📚 Session ID: ${evaluationSession.id}`);
    console.log(`👥 Studenten: ${allStudents.length} (in ${studentGroups.length} Gruppen)`);
    console.log(`👨‍🏫 Dozenten: ${createdLecturers.length}`);
    console.log(`📄 Submissions: ${createdSubmissions.length}`);
    console.log(`💬 Kommentare: ${allComments.length}`);
    console.log(`⭐ Bewertungen: ${allRatings.length}`);
    
    console.log('\n🎯 SUBMISSION IDs:');
    createdSubmissions.forEach((submission, index) => {
      const author = allStudents.find(s => s.id === submission.authorId);
      console.log(`${index + 1}. ${submission.id} - "${submission.title}" von ${author.firstname} ${author.lastname}`);
    });
    
    console.log('\n👤 ERSTE 10 TEST STUDENTEN:');
    allStudents.slice(0, 10).forEach((student, index) => {
      console.log(`${index + 1}. ${student.email} - ${student.firstname} ${student.lastname} (Gruppe ${student.groupIndex + 1})`);
    });
    
    console.log('\n👨‍🏫 DOZENTEN:');
    createdLecturers.forEach((lecturer, index) => {
      console.log(`${index + 1}. ${lecturer.email} - ${lecturer.firstname} ${lecturer.lastname}`);
    });
    
    console.log('\n🌐 FRONTEND TEST URLS:');
    createdSubmissions.forEach((submission, index) => {
      console.log(`${index + 1}. http://localhost:4200/evaluation-forum/${submission.id}`);
    });
    
    console.log('\n📊 PEER REVIEW MATRIX:');
    reviewAssignments.forEach((assignment, index) => {
      const submission = createdSubmissions[assignment.submissionIndex];
      const reviewerNames = assignment.reviewerIndices.map(ri => 
        `${allStudents[ri].firstname} ${allStudents[ri].lastname}`
      ).join(', ');
      console.log(`Submission ${index + 1}: Bewertet von ${reviewerNames}`);
    });
    
    console.log('\n✅ Realistische Forum-Simulation erfolgreich erstellt!');
    console.log('🎉 Bereit für umfassende Tests mit 25 Studenten, 6 Submissions und realistischen Interaktionsmustern!');

  } catch (error) {
    console.error('❌ Error during realistic forum seeding:', error);
    throw error;
  }
}

// Export for manual execution
export default seedEvaluationForumRealistic;

// For direct script execution
if (require.main === module) {
  seedEvaluationForumRealistic()
    .then(() => {
      console.log('🎉 Realistic seeding completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Realistic seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}