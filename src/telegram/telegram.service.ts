import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bot, webhookCallback } from 'grammy';
import { AuthService } from '../auth/auth.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  public bot: Bot;

  constructor(
    private auth: AuthService,
    private ai: AiService,
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'your-telegram-bot-token-here') {
      this.logger.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Bot running in stub mode.');
      return;
    }
    this.bot = new Bot(token);
    this.setupHandlers();
  }

  onModuleInit() {
    if (!this.bot) return;

    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (webhookUrl && process.env.NODE_ENV === 'production') {
      this.bot.api
        .setWebhook(webhookUrl, { secret_token: process.env.TELEGRAM_SECRET_TOKEN })
        .then(() => this.logger.log(`✅ Webhook set: ${webhookUrl}`))
        .catch((e) => this.logger.error('Webhook error', e));
    } else {
      this.bot.start().catch((e) => this.logger.error('Bot start error', e));
      this.logger.log('✅ Telegram bot started with long polling');
    }
  }

  private setupHandlers() {
    const bot = this.bot;

    bot.command('start', async (ctx) => {
      const telegramId = BigInt(ctx.from!.id);
      const result = await this.auth.startSession(telegramId);
      await ctx.reply(result.message, { parse_mode: 'Markdown' });

      await ctx.reply(
        `🎓 *INFOBOT - Asistente Académico de Informática UMSA*\n\n` +
        `Soy un chatbot inteligente diseñado exclusivamente para ayudar a estudiantes con información académica e institucional de la Carrera de Informática.\n\n` +
        `📚 *Puedo ayudarte con:*\n` +
        `• Materias y paralelos\n` +
        `• Docentes y aulas\n` +
        `• Edificios y ubicaciones\n` +
        `• Prerrequisitos de materias\n` +
        `• Objetivos de la carrera\n` +
        `• Modalidades de ingreso y requisitos\n` +
        `• Información institucional\n\n` +
        `🤖 Utilizo inteligencia artificial para responder preguntas de forma rápida, clara y natural.\n\n` +
        `💬 Puedes usar comandos o simplemente escribir tus consultas en lenguaje natural.\n\n` +
        `*Ejemplos:*\n` +
        `• ¿Cuáles son los prerrequisitos de Base de Datos?\n` +
        `• ¿Qué docentes enseñan IA?\n` +
        `• ¿Qué modalidades de ingreso existen?\n` +
        `• Muéstrame las aulas del edificio A\n\n` +
        `🚀 Disponible 24/7 para apoyar a estudiantes y facilitar el acceso a la información académica.`,
        { parse_mode: 'Markdown' },
      );
    });

    bot.command('logout', async (ctx) => {
      const telegramId = BigInt(ctx.from!.id);
      await this.auth.logout(telegramId);
      this.ai.clearHistory(String(ctx.from!.id));
      await ctx.reply('✅ Sesión reiniciada. Escribe /start de nuevo.');
    });

    bot.command('ayuda', async (ctx) => {
      await ctx.reply(
        `📖 *Comandos y consultas disponibles:*\n\n` +
        `💬 Puedes preguntarme en lenguaje natural sobre información académica e institucional.\n\n` +

        `📚 *Materias y Paralelos*\n` +
        `• ¿Qué materias se dictan?\n` +
        `• ¿Qué paralelos tiene Base de Datos?\n` +
        `• ¿Cuáles son los prerrequisitos de IA?\n\n` +

        `👨‍🏫 *Docentes*\n` +
        `• ¿Qué docentes enseñan Redes?\n` +
        `• Muéstrame los docentes registrados.\n\n` +

        `🏫 *Aulas y Edificios*\n` +
        `• ¿Qué aulas hay en el edificio A?\n` +
        `• ¿Dónde queda el laboratorio 101?\n\n` +

        `🎓 *Información Institucional*\n` +
        `• ¿Cuáles son las modalidades de ingreso?\n` +
        `• ¿Cuáles son los objetivos de la carrera?\n` +
        `• ¿Qué requisitos necesito para ingresar?\n\n` +

        `🤖 También puedo responder preguntas generales usando inteligencia artificial.\n\n` +

        `/logout — Reiniciar sesión`,
        { parse_mode: 'Markdown' },
      );
    });

    bot.on('message:text', async (ctx) => {
      const telegramId = BigInt(ctx.from!.id);
      const text = ctx.message.text;

      let session = await this.auth.getSession(telegramId);
      if (!session) {
        await this.auth.startSession(telegramId);
      }

      await ctx.replyWithChatAction('typing');

      try {
        const response = await this.ai.chat(
          String(ctx.from!.id),
          ctx.from!.first_name || 'Estudiante',
          text,
        );
        try {
          await ctx.reply(response, { parse_mode: 'Markdown' });
        } catch (parseError) {
          this.logger.warn('Markdown parse failed, sending as plain text.');
          await ctx.reply(response);
        }
      } catch (err) {
        this.logger.error('Chat error', err);
        await ctx.reply('⚠️ Ocurrió un error. Por favor intenta nuevamente.');
      }
    });

    bot.catch((err) => {
      this.logger.error('Bot error:', err.message);
    });
  }

  getWebhookCallback() {
    if (!this.bot) return null;
    return webhookCallback(this.bot, 'express', {
      secretToken: process.env.TELEGRAM_SECRET_TOKEN,
      timeoutMilliseconds: 10000,
      onTimeout: 'return',
    });
  }
}
