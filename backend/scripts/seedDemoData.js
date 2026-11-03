import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';

const demoUsers = [
  {
    email: 'teacher@example.com',
    password: 'Teacher123!',
    fullName: 'Giáo viên Demo',
    role: 'teacher',
  },
  {
    email: 'student@example.com',
    password: 'Student123!',
    fullName: 'Học sinh Demo',
    role: 'student',
  },
  {
    email: 'parent@example.com',
    password: 'Parent123!',
    fullName: 'Phụ huynh Demo',
    role: 'parent',
  },
];

const upsertUser = (user) =>
  prisma.user.upsert({
    where: { email: user.email },
    update: { fullName: user.fullName, role: user.role },
    create: {
      email: user.email,
      passwordHash: bcrypt.hashSync(user.password, 10),
      fullName: user.fullName,
      role: user.role,
    },
  });

const seed = async () => {
  const [teacher, student, parent] = await Promise.all(demoUsers.map(upsertUser));

  const existingClass = await prisma.class.findFirst({
    where: { teacherId: teacher.id, name: 'Toán 10 - Demo' },
  });

  const demoClass =
    existingClass ??
    (await prisma.class.create({
      data: {
        name: 'Toán 10 - Demo',
        subject: 'Toán',
        teacherId: teacher.id,
      },
    }));

  await prisma.enrollment.upsert({
    where: {
      classId_studentId: {
        classId: demoClass.id,
        studentId: student.id,
      },
    },
    update: {},
    create: {
      classId: demoClass.id,
      studentId: student.id,
    },
  });

  await prisma.parentLink.upsert({
    where: {
      parentId_studentId: {
        parentId: parent.id,
        studentId: student.id,
      },
    },
    update: {},
    create: {
      parentId: parent.id,
      studentId: student.id,
    },
  });

  console.log('Đã seed dữ liệu demo:', {
    users: 3,
    classId: demoClass.id,
    studentEmail: student.email,
    parentEmail: parent.email,
  });
};

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
