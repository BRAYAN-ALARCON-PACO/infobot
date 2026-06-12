import { Controller, Logger, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private telegram: TelegramService) {}

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const handler = this.telegram.getWebhookCallback();
    if (!handler) {
      return res.status(200).json({ ok: true, message: 'Bot not configured' });
    }
    return handler(req, res);
  }

  @Post('set-webhook')
  async setWebhook() {
    const url = process.env.TELEGRAM_WEBHOOK_URL;
    if (!url) return { error: 'TELEGRAM_WEBHOOK_URL not set' };
    if (!this.telegram.bot) return { error: 'Bot not configured' };

    await this.telegram.bot.api.setWebhook(url, {
      secret_token: process.env.TELEGRAM_SECRET_TOKEN,
    });
    return { ok: true, webhook: url };
  }
}
