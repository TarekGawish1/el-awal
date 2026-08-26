import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import { PrismaClient, AssessmentType, QuestionType } from '@prisma/client';

const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const prisma = new PrismaClient({
  datasources: connectionUrl
    ? { db: { url: connectionUrl } }
    : undefined,
});

async function main() {
  console.log('🚀 Seeding homework assignments and exams for all student groups...');

  const groups = await prisma.academicGroup.findMany({
    include: {
      teacher: true,
      sessions: {
        where: { isCancelled: false },
        orderBy: { sessionDate: 'asc' },
      },
    },
  });

  if (groups.length === 0) {
    console.log('⚠️ No academic groups found.');
    return;
  }

  console.log(`Found ${groups.length} groups.`);

  for (const group of groups) {
    const teacherId = group.teacherId;
    let academicStage = 'SECONDARY';
    if (group.gradeLevel?.includes('الابتدائي')) academicStage = 'PRIMARY';
    else if (group.gradeLevel?.includes('الإعدادي')) academicStage = 'MIDDLE';

    // Find the latest session and the next session for due date
    const now = new Date();
    const pastSessions = group.sessions.filter((s) => new Date(s.sessionDate).getTime() <= now.getTime());
    const latestSession = pastSessions.length > 0 ? pastSessions[pastSessions.length - 1] : group.sessions[0];

    const futureSessions = group.sessions.filter(
      (s) => latestSession && new Date(s.sessionDate).getTime() > new Date(latestSession.sessionDate).getTime(),
    );
    const nextSession = futureSessions.length > 0 ? futureSessions[0] : null;

    let hwDueDate: Date;
    if (nextSession) {
      hwDueDate = new Date(nextSession.sessionDate);
      if (nextSession.startTime) {
        const [h, m] = nextSession.startTime.split(':').map(Number);
        if (!isNaN(h)) hwDueDate.setHours(h, m, 0, 0);
      } else {
        hwDueDate.setHours(16, 0, 0, 0);
      }
    } else {
      hwDueDate = new Date();
      hwDueDate.setDate(hwDueDate.getDate() + 7);
      hwDueDate.setHours(16, 0, 0, 0);
    }

    const examDueDate = new Date();
    examDueDate.setDate(examDueDate.getDate() + 14);
    examDueDate.setHours(22, 0, 0, 0);

    const sessionTopicName = latestSession?.topic || `حصة ${group.name}`;

    console.log(`\n📚 Setting up assessments for group: [${group.name}] (${group.gradeLevel})`);
    console.log(`   - Attached session: ${sessionTopicName}`);
    console.log(`   - Homework due date: ${hwDueDate.toISOString()}`);

    // 1. Create / Update Homework (ASSIGNMENT)
    const hwTitle = `واجب: ${sessionTopicName}`;
    
    // Check if homework with this title or groupId already exists
    const existingHw = await prisma.assessment.findFirst({
      where: {
        groupId: group.id,
        type: AssessmentType.ASSIGNMENT,
        title: hwTitle,
      },
    });

    if (!existingHw) {
      const homework = await prisma.assessment.create({
        data: {
          teacherId,
          groupId: group.id,
          academicStage,
          gradeLevel: group.gradeLevel,
          title: hwTitle,
          description: `واجب تطبيقي على ما تم شرحه في ${sessionTopicName}. يشمل أسئلة اختيار من متعدد، صح وخطأ، وسؤال مقالي يقبل الكتابة ورفع صورة الحل من الكشكول.`,
          type: AssessmentType.ASSIGNMENT,
          totalScore: 20.0,
          passingScore: 10.0,
          isAutoGraded: false,
          isPublished: true,
          allowMultipleAttempts: true,
          dueDate: hwDueDate,
          targetGroups: {
            connect: [{ id: group.id }],
          },
          questions: {
            create: [
              {
                questionNumber: 1,
                questionText: 'اختر الإجابة الصحيحة: ما هي الوحدة الأساسية لقياس القوة في النظام الدولي للوحدات؟',
                questionType: QuestionType.MULTIPLE_CHOICE,
                optionsData: ['النيوتن (Newton)', 'الجول (Joule)', 'الواط (Watt)', 'الباسكال (Pascal)'],
                correctAnswer: 'النيوتن (Newton)',
                explanation: 'النيوتن هو وحدة قياس القوة في النظام الدولي، ويعادل كجم.م/ث².',
                points: 5.0,
              },
              {
                questionNumber: 2,
                questionText: 'ضع علامة صح أو خطأ: لكل فعل رد فعل مساوٍ له في المقدار ومضاد له في الاتجاه.',
                questionType: QuestionType.TRUE_FALSE,
                optionsData: null,
                correctAnswer: 'true',
                explanation: 'هذا هو نص قانون نيوتن الثالث للحركة.',
                points: 5.0,
              },
              {
                questionNumber: 3,
                questionText: 'سؤال مقالي: اذكر نص القانون الأول لنيوتن (قانون القصور الذاتي)، مع ذكر مثال تطبيقي من الحياة اليومية. (يمكنك كتابة الإجابة أو تصوير حلك في الكشكول ورفع الصورة)',
                questionType: QuestionType.ESSAY,
                optionsData: null,
                correctAnswer: 'يبقى الجسم على حالته من السكون أو الحركة بسرعة منتظمة في خط مستقيم ما لم تؤثر عليه قوة محصلة تغير من حالته. مثال: اندفاع الركاب للأمام عند توقف الحافلة فجأة.',
                explanation: 'يتم تقييم الشرح والمثال من قبل المعلم.',
                points: 10.0,
              },
            ],
          },
        },
      });
      console.log(`   ✅ تم إنشاء الواجب: "${homework.title}" (ID: ${homework.id})`);
    } else {
      // Update due date to ensure it is valid
      await prisma.assessment.update({
        where: { id: existingHw.id },
        data: {
          dueDate: hwDueDate,
          isPublished: true,
        },
      });
      console.log(`   🔄 تم تحديث موعد استحقاق الواجب الحالي: "${existingHw.title}"`);
    }

    // 2. Create / Update Periodic Exam (EXAM)
    const examTitle = `اختبار دوري: تقييم مهارات ${group.name}`;
    const existingExam = await prisma.assessment.findFirst({
      where: {
        groupId: group.id,
        type: AssessmentType.EXAM,
        title: examTitle,
      },
    });

    if (!existingExam) {
      const exam = await prisma.assessment.create({
        data: {
          teacherId,
          groupId: group.id,
          academicStage,
          gradeLevel: group.gradeLevel,
          title: examTitle,
          description: `اختبار تقييمي شامل لمتابعة مستوى استيعاب الطلاب في ${group.name}. يتضمن أسئلة متنوعة ومقالية.`,
          type: AssessmentType.EXAM,
          totalScore: 30.0,
          passingScore: 15.0,
          durationMinutes: 45,
          isAutoGraded: false,
          isPublished: true,
          allowMultipleAttempts: false,
          dueDate: examDueDate,
          targetGroups: {
            connect: [{ id: group.id }],
          },
          questions: {
            create: [
              {
                questionNumber: 1,
                questionText: 'أي من الكميات التالية تعتبر كمية فيزيائية متجهة؟',
                questionType: QuestionType.MULTIPLE_CHOICE,
                optionsData: ['الإزاحة', 'المسافة', 'الكتلة', 'الزمن'],
                correctAnswer: 'الإزاحة',
                explanation: 'الإزاحة كمية متجهة تلزم لمعرفتها تحديد المقدار والاتجاه.',
                points: 5.0,
              },
              {
                questionNumber: 2,
                questionText: 'ضع علامة صح أو خطأ: السرعة اللحظية لجسم هي سرعته عند لحظة زمنية معينة.',
                questionType: QuestionType.TRUE_FALSE,
                optionsData: null,
                correctAnswer: 'true',
                explanation: 'السرعة اللحظية هي مقدار واتجاه حركة الجسم عند لحظة محددة.',
                points: 5.0,
              },
              {
                questionNumber: 3,
                questionText: 'مسألة رياضية مقالية: تحرك جسم من السكون بعجلة منتظمة مقدارها 2 م/ث² لمدة 5 ثوانٍ. احسب السرعة النهائية للجسم والمسافة المقطوعة مع كتابة خطوات الحل كاملة. (يمكنك كتابة خطوات الحل أو تصوير ورقة الإجابة ورفعها)',
                questionType: QuestionType.ESSAY,
                optionsData: null,
                correctAnswer: 'السرعة النهائية vf = vi + a*t = 0 + 2*5 = 10 m/s. المسافة d = vi*t + 0.5*a*t² = 0 + 0.5*2*25 = 25 m.',
                explanation: 'السرعة النهائية = 10 م/ث، والمسافة المقطوعة = 25 متر.',
                points: 20.0,
              },
            ],
          },
        },
      });
      console.log(`   ✅ تم إنشاء الاختبار: "${exam.title}" (ID: ${exam.id})`);
    } else {
      await prisma.assessment.update({
        where: { id: existingExam.id },
        data: {
          dueDate: examDueDate,
          isPublished: true,
        },
      });
      console.log(`   🔄 تم تحديث موعد الاختبار الحالي: "${existingExam.title}"`);
    }
  }

  console.log('\n✨ All groups seeded successfully with homework and exams!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding assessments:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
