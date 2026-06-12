import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding InfoBot database — UMSA Informática...');

  // ─── Cleanup (orden inverso a FK) ───────────────────────────────────────────
  await prisma.horario.deleteMany();
  await prisma.paralelo.deleteMany();
  await prisma.prerequisito.deleteMany();
  await prisma.materia.deleteMany();
  await prisma.docente.deleteMany();
  await prisma.aula.deleteMany();
  await prisma.edificio.deleteMany();
  await prisma.planEstudio.deleteMany();
  await prisma.electiva.deleteMany();
  await prisma.tecnicoSuperior.deleteMany();
  await prisma.mencion.deleteMany();
  await prisma.requisitoIngreso.deleteMany();
  await prisma.modalidadIngreso.deleteMany();
  await prisma.requisitoBeca.deleteMany();
  await prisma.beca.deleteMany();
  await prisma.enlace.deleteMany();
  await prisma.contacto.deleteMany();
  await prisma.autoridad.deleteMany();
  await prisma.infoInstitucional.deleteMany();
  await prisma.objetivo.deleteMany();
  await prisma.carrera.deleteMany();
  await prisma.telegramSession.deleteMany();

  console.log('🗑️  Tablas limpiadas');

  // ─── Carrera ────────────────────────────────────────────────────────────────
  const informatica = await prisma.carrera.create({
    data: {
      nombre: 'Informática',
      facultad: 'Facultad de Ciencias Puras y Naturales',
      universidad: 'Universidad Mayor de San Andrés (UMSA)',
      tituloOtorgado: 'Licenciatura en Informática',
      gestion: '2025',
    },
  });

  console.log('✅ Carrera creada:', informatica.nombre);

  // ─── Info Institucional ─────────────────────────────────────────────────────
  await prisma.infoInstitucional.createMany({
    data: [
      {
        carreraId: informatica.id,
        tipo: 'mision',
        contenido:
          'Formar profesionales en Informática con sólidas bases científicas y tecnológicas, capaces de diseñar, implementar y gestionar sistemas de información que contribuyan al desarrollo del país.',
      },
      {
        carreraId: informatica.id,
        tipo: 'vision',
        contenido:
          'Ser una carrera de excelencia académica reconocida a nivel nacional e internacional por la calidad de sus graduados y su contribución al avance tecnológico de Bolivia.',
      },
    ],
  });

  // ─── Objetivos ──────────────────────────────────────────────────────────────
  await prisma.objetivo.createMany({
    data: [
      { carreraId: informatica.id, descripcion: 'Formar profesionales con competencias técnicas en ciencias de la computación.', orden: 1 },
      { carreraId: informatica.id, descripcion: 'Desarrollar habilidades de investigación aplicada en tecnologías emergentes.', orden: 2 },
      { carreraId: informatica.id, descripcion: 'Fomentar el uso responsable de la tecnología para el bien común.', orden: 3 },
    ],
  });

  // ─── Autoridades ────────────────────────────────────────────────────────────
  await prisma.autoridad.createMany({
    data: [
      { carreraId: informatica.id, cargo: 'Director de Carrera', nombreCompleto: 'Dr. Juan Carlos Mamani Quispe', periodo: '2023-2027' },
      { carreraId: informatica.id, cargo: 'Secretario Académico', nombreCompleto: 'Mg. Rosa Elena Flores Vargas', periodo: '2023-2027' },
    ],
  });

  console.log('✅ Info institucional, objetivos y autoridades creados');

  // ─── Menciones ──────────────────────────────────────────────────────────────
  const [ingSistemas, cienciasComp] = await Promise.all([
    prisma.mencion.create({ data: { nombre: 'Ingeniería de Sistemas', prefijosigla: 'IS' } }),
    prisma.mencion.create({ data: { nombre: 'Ciencias de la Computación', prefijosigla: 'CC' } }),
  ]);

  console.log('✅ Menciones creadas');

  // ─── Edificios y Aulas ──────────────────────────────────────────────────────
  const edificioA = await prisma.edificio.create({
    data: {
      nombre: 'Pabellón Informática',
      direccion: 'Ciudad Universitaria, Zona Miraflores, La Paz',
      urlMaps: 'https://maps.google.com/?q=UMSA+Informatica',
    },
  });

  const [aula101, labA] = await Promise.all([
    prisma.aula.create({
      data: {
        codigo: 'INF-101',
        nombre: 'Aula 101',
        tipo: 'aula',
        edificioId: edificioA.id,
        ubicacionReferencia: 'Primer piso, ala izquierda',
      },
    }),
    prisma.aula.create({
      data: {
        codigo: 'LAB-A',
        nombre: 'Laboratorio A',
        tipo: 'laboratorio',
        edificioId: edificioA.id,
        ubicacionReferencia: 'Segundo piso, ala derecha',
      },
    }),
  ]);

  console.log('✅ Edificios y aulas creados');

  // ─── Docentes ───────────────────────────────────────────────────────────────
  const [doc1, doc2, doc3] = await Promise.all([
    prisma.docente.create({ data: { nombreCompleto: 'Mg. Carlos Perez Salinas' } }),
    prisma.docente.create({ data: { nombreCompleto: 'Dr. Ana Gomez Vargas' } }),
    prisma.docente.create({ data: { nombreCompleto: 'Lic. Marco Antonio Quispe' } }),
  ]);

  console.log('✅ Docentes creados');

  // ─── Materias ───────────────────────────────────────────────────────────────
  const [introInfo, algComp, bdsI, bdsII, redeI] = await Promise.all([
    prisma.materia.create({ data: { sigla: 'INF-111', nombre: 'Introducción a la Informática', semestre: 1 } }),
    prisma.materia.create({ data: { sigla: 'INF-121', nombre: 'Algoritmos y Computación', semestre: 1 } }),
    prisma.materia.create({ data: { sigla: 'INF-161', nombre: 'Bases de Datos I', semestre: 3, mencionId: ingSistemas.id } }),
    prisma.materia.create({ data: { sigla: 'INF-261', nombre: 'Bases de Datos II', semestre: 5, mencionId: ingSistemas.id } }),
    prisma.materia.create({ data: { sigla: 'INF-371', nombre: 'Redes I', semestre: 5, mencionId: ingSistemas.id } }),
  ]);

  console.log('✅ Materias creadas');

  // ─── Prerequisitos ──────────────────────────────────────────────────────────
  await prisma.prerequisito.create({
    data: { materiaId: bdsII.id, prerequisitoMateriaId: bdsI.id },
  });

  // ─── Paralelos ──────────────────────────────────────────────────────────────
  const [parIntroA, parIntroB, parBdsA] = await Promise.all([
    prisma.paralelo.create({ data: { materiaId: introInfo.id, letra: 'A', docenteId: doc1.id, gestion: '2025-1' } }),
    prisma.paralelo.create({ data: { materiaId: introInfo.id, letra: 'B', docenteId: doc3.id, gestion: '2025-1' } }),
    prisma.paralelo.create({ data: { materiaId: bdsI.id, letra: 'A', docenteId: doc2.id, gestion: '2025-1' } }),
  ]);

  // ─── Horarios ───────────────────────────────────────────────────────────────
  // Nota: hora_inicio / hora_fin son columnas TIME en PG.
  // Prisma espera un DateTime completo; se usa fecha base 1970-01-01.
  const toTime = (h: string) => new Date(`1970-01-01T${h}:00.000Z`);

  await prisma.horario.createMany({
    data: [
      { paraleloId: parIntroA.id, dia: 'Lunes',    horaInicio: toTime('08:00'), horaFin: toTime('10:00'), aulaId: aula101.id },
      { paraleloId: parIntroA.id, dia: 'Miércoles', horaInicio: toTime('08:00'), horaFin: toTime('10:00'), aulaId: aula101.id },
      { paraleloId: parIntroB.id, dia: 'Martes',   horaInicio: toTime('10:00'), horaFin: toTime('12:00'), aulaId: aula101.id },
      { paraleloId: parBdsA.id,   dia: 'Jueves',   horaInicio: toTime('14:00'), horaFin: toTime('16:00'), aulaId: labA.id   },
      { paraleloId: parBdsA.id,   dia: 'Viernes',  horaInicio: toTime('14:00'), horaFin: toTime('16:00'), aulaId: labA.id   },
    ],
  });

  console.log('✅ Paralelos y horarios creados');

  // ─── Plan de Estudio ────────────────────────────────────────────────────────
  await prisma.planEstudio.createMany({
    data: [
      { mencionId: ingSistemas.id, materiaSigla: 'INF-111', materiaNombre: 'Introducción a la Informática', semestre: 1, orden: 1 },
      { mencionId: ingSistemas.id, materiaSigla: 'INF-121', materiaNombre: 'Algoritmos y Computación',      semestre: 1, orden: 2 },
      { mencionId: ingSistemas.id, materiaSigla: 'INF-161', materiaNombre: 'Bases de Datos I',              semestre: 3, orden: 1 },
      { mencionId: ingSistemas.id, materiaSigla: 'INF-261', materiaNombre: 'Bases de Datos II',             semestre: 5, prerequisitosTexto: 'INF-161', orden: 1 },
      { mencionId: ingSistemas.id, materiaSigla: 'INF-371', materiaNombre: 'Redes I',                       semestre: 5, orden: 2 },
    ],
  });

  // ─── Modalidades de Ingreso ─────────────────────────────────────────────────
  const [psa, prefac] = await Promise.all([
    prisma.modalidadIngreso.create({
      data: {
        nombre: 'Prueba de Suficiencia Académica (PSA)',
        sigla: 'PSA',
        descripcion: 'Examen de admisión para bachilleres que desean ingresar sin el curso prefacultativo.',
      },
    }),
    prisma.modalidadIngreso.create({
      data: {
        nombre: 'Curso Prefacultativo',
        sigla: 'PREFAC',
        descripcion: 'Curso nivelatorio de 3 meses que se realiza cada gestión antes del inicio del año académico.',
      },
    }),
  ]);

  await prisma.requisitoIngreso.createMany({
    data: [
      { modalidadId: psa.id,    descripcion: 'Diploma de Bachiller en original y fotocopia.', orden: 1 },
      { modalidadId: psa.id,    descripcion: 'Cédula de identidad vigente.', orden: 2 },
      { modalidadId: psa.id,    descripcion: 'Certificado de nacimiento original.', orden: 3 },
      { modalidadId: prefac.id, descripcion: 'Diploma de Bachiller o certificado de egreso.', orden: 1 },
      { modalidadId: prefac.id, descripcion: 'Formulario de inscripción al curso prefacultativo.', orden: 2 },
    ],
  });

  console.log('✅ Modalidades de ingreso y requisitos creados');

  // ─── Becas ──────────────────────────────────────────────────────────────────
  const becaExc = await prisma.beca.create({
    data: {
      nombre: 'Beca de Excelencia Académica',
      descripcion: 'Beca otorgada a los mejores estudiantes de cada gestión según promedio académico.',
    },
  });

  await prisma.requisitoBeca.createMany({
    data: [
      { becaId: becaExc.id, descripcion: 'Promedio académico igual o superior a 65 puntos.', orden: 1 },
      { becaId: becaExc.id, descripcion: 'No tener materias reprobadas en la gestión anterior.', orden: 2 },
      { becaId: becaExc.id, descripcion: 'Presentar solicitud formal al Departamento de Bienestar Estudiantil.', orden: 3 },
    ],
  });

  // ─── Contacto ───────────────────────────────────────────────────────────────
  await prisma.contacto.createMany({
    data: [
      {
        area: 'Secretaría de Carrera',
        direccion: 'Pabellón Informática, Planta Baja',
        telefono: '(+591-2) 2795948',
        email: 'secretaria@informatica.umsa.bo',
        horarioAtencion: 'Lunes a Viernes 08:30 - 12:30 / 14:30 - 18:30',
      },
      {
        area: 'Dirección de Carrera',
        direccion: 'Pabellón Informática, 1er Piso',
        email: 'director@informatica.umsa.bo',
        horarioAtencion: 'Lunes a Viernes 09:00 - 12:00',
      },
    ],
  });

  // ─── Enlaces ────────────────────────────────────────────────────────────────
  await prisma.enlace.createMany({
    data: [
      { nombre: 'Sitio Oficial de la Carrera', url: 'https://informatica.umsa.bo', tipo: 'web' },
      { nombre: 'Campus Virtual UMSA', url: 'https://campusvirtual.umsa.bo', tipo: 'plataforma' },
      { nombre: 'Sistema de Notas', url: 'https://notas.umsa.bo', tipo: 'sistema' },
    ],
  });

  console.log('✅ Becas, contacto y enlaces creados');
  console.log('\n🎉 Seed finalizado correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });