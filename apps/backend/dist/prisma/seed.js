"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting El Awal Demo Database Seeding...');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const teacherUser = await prisma.user.upsert({
        where: { email: 'teacher@elawal.com' },
        update: { passwordHash },
        create: {
            fullName: 'أ. طارق عبد الله',
            email: 'teacher@elawal.com',
            phone: '+201000000001',
            passwordHash,
            role: client_1.UserRole.TEACHER,
            isActive: true,
            teacherProfile: {
                create: {
                    specialty: 'اللغة العربية والبلاغة',
                    bio: 'معلم أول اللغة العربية للثانوية العامة بخبرة أكثر من 15 عاماً',
                },
            },
        },
        include: { teacherProfile: true },
    });
    console.log(`✅ Teacher created: ${teacherUser.fullName} (${teacherUser.email})`);
    const staffUser = await prisma.user.upsert({
        where: { email: 'staff@elawal.com' },
        update: { passwordHash },
        create: {
            fullName: 'سارة إبراهيم',
            email: 'staff@elawal.com',
            phone: '+201000000002',
            passwordHash,
            role: client_1.UserRole.SECRETARIAT,
            isActive: true,
            secretariatProfile: {
                create: {
                    staffTitle: 'مسؤول شؤون الطلاب والتسجيل',
                },
            },
        },
        include: { secretariatProfile: true },
    });
    console.log(`✅ Secretariat staff created: ${staffUser.fullName} (${staffUser.email})`);
    const group1 = await prisma.academicGroup.create({
        data: {
            name: 'الصف الثالث الثانوي - مجموعة أ (الأحد والأربعاء)',
            gradeLevel: 'الصف الثالث الثانوي',
            description: 'مجموعة المراجعة المكثفة وتدريبات النحو والبلاغة',
            maxCapacity: 40,
            monthlyFee: 450.00,
            teacherId: teacherUser.id,
            isActive: true,
            schedules: {
                create: [
                    { dayOfWeek: 0, startTime: '17:00', endTime: '19:00', location: 'قاعة 1' },
                    { dayOfWeek: 3, startTime: '17:00', endTime: '19:00', location: 'قاعة 1' },
                ],
            },
        },
    });
    const group2 = await prisma.academicGroup.create({
        data: {
            name: 'الصف الثاني الثانوي - مجموعة ب (السبت والثلاثاء)',
            gradeLevel: 'الصف الثاني الثانوي',
            description: 'مجموعة الشرح والتأسيس المنهجي',
            maxCapacity: 35,
            monthlyFee: 400.00,
            teacherId: teacherUser.id,
            isActive: true,
            schedules: {
                create: [
                    { dayOfWeek: 6, startTime: '15:00', endTime: '17:00', location: 'قاعة 2' },
                    { dayOfWeek: 2, startTime: '15:00', endTime: '17:00', location: 'قاعة 2' },
                ],
            },
        },
    });
    console.log(`✅ Academic Groups & Schedules created: [${group1.name}], [${group2.name}]`);
    const demoStudentsData = [
        {
            fullName: 'محمود أحمد علي',
            phone: '+201011111111',
            email: 'mahmoud@student.elawal.com',
            studentCode: 'STU-2026-0001',
            qrCodeToken: 'qr_tok_demo_student_0001',
            gradeLevel: 'الصف الثالث الثانوي',
            groupId: group1.id,
            parentName: 'أحمد علي إبراهيم',
            parentPhone: '+201099999991',
        },
        {
            fullName: 'عمر خالد محمود',
            phone: '+201011111112',
            email: 'omar@student.elawal.com',
            studentCode: 'STU-2026-0002',
            qrCodeToken: 'qr_tok_demo_student_0002',
            gradeLevel: 'الصف الثالث الثانوي',
            groupId: group1.id,
            parentName: 'خالد محمود حسن',
            parentPhone: '+201099999992',
        },
        {
            fullName: 'فاطمة محمد السيد',
            phone: '+201011111113',
            email: 'fatma@student.elawal.com',
            studentCode: 'STU-2026-0003',
            qrCodeToken: 'qr_tok_demo_student_0003',
            gradeLevel: 'الصف الثالث الثانوي',
            groupId: group1.id,
            parentName: 'محمد السيد عبد العزيز',
            parentPhone: '+201099999993',
        },
        {
            fullName: 'يوسف حسن مصطفى',
            phone: '+201011111114',
            email: 'youssef@student.elawal.com',
            studentCode: 'STU-2026-0004',
            qrCodeToken: 'qr_tok_demo_student_0004',
            gradeLevel: 'الصف الثاني الثانوي',
            groupId: group2.id,
            parentName: 'حسن مصطفى كامل',
            parentPhone: '+201099999994',
        },
        {
            fullName: 'مريم إبراهيم عبد الله',
            phone: '+201011111115',
            email: 'mariam@student.elawal.com',
            studentCode: 'STU-2026-0005',
            qrCodeToken: 'qr_tok_demo_student_0005',
            gradeLevel: 'الصف الثاني الثانوي',
            groupId: group2.id,
            parentName: 'إبراهيم عبد الله خليل',
            parentPhone: '+201099999995',
        },
    ];
    const createdStudents = [];
    for (const s of demoStudentsData) {
        const studentUser = await prisma.user.create({
            data: {
                fullName: s.fullName,
                phone: s.phone,
                email: s.email,
                passwordHash,
                role: client_1.UserRole.STUDENT,
                isActive: true,
                studentProfile: {
                    create: {
                        studentCode: s.studentCode,
                        qrCodeToken: s.qrCodeToken,
                        gradeLevel: s.gradeLevel,
                        academicStatus: client_1.StudentAcademicStatus.ACTIVE,
                        emergencyPhone: s.parentPhone,
                    },
                },
            },
            include: { studentProfile: true },
        });
        const parentUser = await prisma.user.create({
            data: {
                fullName: s.parentName,
                phone: s.parentPhone,
                passwordHash,
                role: client_1.UserRole.PARENT,
                isActive: true,
                parentProfile: {
                    create: {
                        relationshipType: 'Father',
                    },
                },
            },
            include: { parentProfile: true },
        });
        await prisma.parentStudentLink.create({
            data: {
                parentId: parentUser.id,
                studentId: studentUser.id,
            },
        });
        await prisma.groupEnrollment.create({
            data: {
                groupId: s.groupId,
                studentId: studentUser.id,
                status: client_1.GroupEnrollmentStatus.ACTIVE,
            },
        });
        createdStudents.push({ user: studentUser, profile: studentUser.studentProfile });
        console.log(`✅ Student onboarded: [${s.studentCode}] ${s.fullName}`);
    }
    const sessionDate1 = new Date();
    sessionDate1.setDate(sessionDate1.getDate() - 3);
    const session1 = await prisma.lessonSession.create({
        data: {
            groupId: group1.id,
            sessionDate: sessionDate1,
            startTime: '17:00',
            topic: 'مقدمة في البلاغة - علم البيان وهمزة الوصل',
            attendanceRecords: {
                create: [
                    {
                        studentId: createdStudents[0].user.id,
                        status: client_1.AttendanceStatus.PRESENT,
                        recordingMethod: client_1.RecordingMethod.QR_SCAN,
                        recordedById: teacherUser.id,
                    },
                    {
                        studentId: createdStudents[1].user.id,
                        status: client_1.AttendanceStatus.PRESENT,
                        recordingMethod: client_1.RecordingMethod.QR_SCAN,
                        recordedById: teacherUser.id,
                    },
                    {
                        studentId: createdStudents[2].user.id,
                        status: client_1.AttendanceStatus.ABSENT,
                        recordingMethod: client_1.RecordingMethod.MANUAL,
                        recordedById: teacherUser.id,
                        notes: 'غياب بعذر مسبق',
                    },
                ],
            },
        },
    });
    const sessionDate2 = new Date();
    const session2 = await prisma.lessonSession.create({
        data: {
            groupId: group1.id,
            sessionDate: sessionDate2,
            startTime: '17:00',
            topic: 'التدريبات الشاملة على الوحدة الأولى',
            attendanceRecords: {
                create: [
                    {
                        studentId: createdStudents[0].user.id,
                        status: client_1.AttendanceStatus.PRESENT,
                        recordingMethod: client_1.RecordingMethod.QR_SCAN,
                        recordedById: teacherUser.id,
                    },
                ],
            },
        },
    });
    console.log(`✅ Lesson Sessions & Attendance created: Session 1 [${session1.id}], Session 2 [${session2.id}]`);
    console.log('🎉 Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map