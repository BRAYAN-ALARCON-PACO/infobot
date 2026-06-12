import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface ToolCallLike {
  id: string;
  function: { name: string; arguments: string };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;
  private conversations = new Map<string, ChatMessage[]>();

  constructor(private prisma: PrismaService) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async chat(telegramId: string, studentName: string, userMessage: string): Promise<string> {
    const key = `${telegramId}`;
    if (!this.conversations.has(key)) this.conversations.set(key, []);
    const history = this.conversations.get(key)!;

    if (history.length > 3) history.splice(0, history.length - 3);

    const systemPrompt = `Eres InfoBot, el asistente académico de la Carrera de Informática de la UMSA.
Hablas con: ${studentName}.
Usa emojis: 📚 📅 ✅ 📊 🏫 👨‍🏫 ⚠️ 🎓.
- Usa *negrita* para info importante, pero NO uses asteriscos (*) para hacer listas. Usa guiones (-) o viñetas (•) para las listas.
Ayudas a estudiantes con informacion de la base de datos: edificios, aulas, paralelos, docentes, materias, informacion institucional (de la carrera), objetivos, modalidades de ingreso y sus requisitos, etc.
Debes responder en español, de forma clara, academica y como un chatbot.
Si la pregunta requiere datos del sistema (base de datos), usa las herramientas disponibles para obtenerlos.
Si es una pregunta general, responde normalmente.`;

    
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'get_materias',
          description: 'Obtiene la lista de materias de la carrera con su sigla, semestre, mención y paralelos disponibles.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_horarios',
          description: 'Obtiene los horarios de clases de todos los paralelos, incluyendo docente, aula, día y hora.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_info_institucional',
          description: 'Obtiene información institucional como misión, visión, objetivos, autoridades, contacto y enlaces de la carrera.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_ingreso_becas',
          description: 'Obtiene modalidades de ingreso a la carrera, sus requisitos, y becas disponibles con sus requisitos.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_plan_estudio',
          description: 'Obtiene el plan de estudios organizado por semestre, incluyendo electivas y programa de técnico superior.',
          parameters: { type: 'object', properties: {} },
        },
      },
    ];

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ];

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];

     
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        const toolCall = choice.message.tool_calls[0] as unknown as ToolCallLike;
        const fnName = toolCall.function.name;
        let functionResult: Record<string, unknown> = {};

        // ── get_materias ──────────────────────────────────────────────────
        if (fnName === 'get_materias') {
          const materias = await this.prisma.materia.findMany({
            include: {
              mencion: true,
              paralelos: { include: { docente: true } },
            },
            orderBy: [{ semestre: 'asc' }, { nombre: 'asc' }],
          });

          functionResult = {
            materias: materias.map((m) => ({
              sigla: m.sigla,
              nombre: m.nombre,
              semestre: m.semestre,
              mencion: m.mencion?.nombre ?? 'Común',
              paralelos: m.paralelos.map((p) => ({
                letra: p.letra,
                gestion: p.gestion,
                docente: p.docente?.nombreCompleto ?? 'Sin asignar',
              })),
            })),
          };

        // ── get_horarios ──────────────────────────────────────────────────
        } else if (fnName === 'get_horarios') {
          const horarios = await this.prisma.horario.findMany({
            include: {
              paralelo: {
                include: {
                  materia: true,
                  docente: true,
                },
              },
              aula: { include: { edificio: true } },
            },
            orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
          });

          functionResult = {
            horarios: horarios.map((h) => ({
              materia: h.paralelo.materia.nombre,
              sigla: h.paralelo.materia.sigla,
              paralelo: h.paralelo.letra,
              docente: h.paralelo.docente?.nombreCompleto ?? 'Sin asignar',
              dia: h.dia,
              horaInicio: h.horaInicio.toISOString().substring(11, 16),
              horaFin: h.horaFin.toISOString().substring(11, 16),
              aula: h.aula ? `${h.aula.nombre} (${h.aula.codigo})` : 'Sin aula asignada',
              edificio: h.aula?.edificio?.nombre ?? '',
            })),
          };

        // ── get_info_institucional ────────────────────────────────────────
        } else if (fnName === 'get_info_institucional') {
          const [infoList, objetivos, autoridades, contactos, enlaces] = await Promise.all([
            this.prisma.infoInstitucional.findMany(),
            this.prisma.objetivo.findMany({ orderBy: { orden: 'asc' } }),
            this.prisma.autoridad.findMany({ orderBy: { cargo: 'asc' } }),
            this.prisma.contacto.findMany(),
            this.prisma.enlace.findMany(),
          ]);

          functionResult = {
            infoInstitucional: Object.fromEntries(infoList.map((i) => [i.tipo, i.contenido])),
            objetivos: objetivos.map((o) => o.descripcion),
            autoridades: autoridades.map((a) => ({ cargo: a.cargo, nombre: a.nombreCompleto, periodo: a.periodo })),
            contactos: contactos.map((c) => ({
              area: c.area,
              direccion: c.direccion,
              telefono: c.telefono,
              email: c.email,
              whatsapp: c.whatsapp,
              horario: c.horarioAtencion,
            })),
            enlaces: enlaces.map((e) => ({ nombre: e.nombre, url: e.url, tipo: e.tipo })),
          };

        // ── get_ingreso_becas ─────────────────────────────────────────────
        } else if (fnName === 'get_ingreso_becas') {
          const [modalidades, becas] = await Promise.all([
            this.prisma.modalidadIngreso.findMany({
              include: { requisitos: { orderBy: { orden: 'asc' } } },
            }),
            this.prisma.beca.findMany({
              include: { requisitos: { orderBy: { orden: 'asc' } } },
            }),
          ]);

          functionResult = {
            modalidadesIngreso: modalidades.map((m) => ({
              nombre: m.nombre,
              sigla: m.sigla,
              descripcion: m.descripcion,
              requisitos: m.requisitos.map((r) => r.descripcion),
            })),
            becas: becas.map((b) => ({
              nombre: b.nombre,
              descripcion: b.descripcion,
              requisitos: b.requisitos.map((r) => r.descripcion),
            })),
          };

        // ── get_plan_estudio ──────────────────────────────────────────────
        } else if (fnName === 'get_plan_estudio') {
          const [planEstudio, electivas, tecnicoSuperior] = await Promise.all([
            this.prisma.planEstudio.findMany({
              include: { mencion: true },
              orderBy: [{ semestre: 'asc' }, { orden: 'asc' }],
            }),
            this.prisma.electiva.findMany({
              include: { mencion: true },
              orderBy: { nombre: 'asc' },
            }),
            this.prisma.tecnicoSuperior.findMany({
              include: { mencion: true },
              orderBy: [{ orden: 'asc' }],
            }),
          ]);

          functionResult = {
            planEstudio: planEstudio.map((p) => ({
              semestre: p.semestre,
              sigla: p.materiaSigla,
              nombre: p.materiaNombre,
              mencion: p.mencion.nombre,
              prerequisitos: p.prerequisitosTexto ?? 'Ninguno',
            })),
            electivas: electivas.map((e) => ({
              sigla: e.sigla,
              nombre: e.nombre,
              mencion: e.mencion.nombre,
              prerequisitos: e.prerequisitosTexto ?? 'Ninguno',
            })),
            tecnicoSuperior: tecnicoSuperior.map((t) => ({
              programa: t.nombrePrograma,
              sigla: t.materiaSigla,
              nombre: t.materiaNombre,
              tipo: t.tipo,
              mencion: t.mencion.nombre,
            })),
          };
        }

        // ── Second pass: send function result back to Grok ────────────────
        const followUpMessages: ChatMessage[] = [
          ...messages,
          choice.message as ChatMessage,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult),
          },
        ];

        const followUpResponse = await this.client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: followUpMessages,
        });

        const finalText = followUpResponse.choices[0].message.content ?? '';

        // Save history (without system prompt)
        history.push(
          { role: 'user', content: userMessage },
          choice.message as ChatMessage,
          { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(functionResult) },
          { role: 'assistant', content: finalText },
        );
        this.conversations.set(key, history);
        return finalText;
      }

      // ── Plain text response ───────────────────────────────────────────────
      const textResult = choice.message.content ?? '';
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: textResult },
      );
      this.conversations.set(key, history);
      return textResult;

    } catch (err: any) {
      this.logger.error('OpenAI error', err?.message);
      return '⚠️ Ocurrió un error consultando a la IA. ¡Intenta de nuevo!';
    }
  }

  clearHistory(telegramId: string): void {
    this.conversations.delete(`${telegramId}`);
  }
}
