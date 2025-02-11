import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { DecryptCommand } from './commands/decrypt.command';
import { EncryptCommand } from './commands/encrypt.command';
import { LicenseCommand } from './commands/license.command';
import { DownloadCommand } from './commands/download.command';
import { UploadCommand } from './commands/upload.command';
import { QueryCommand } from './commands/query.command';
import { SaveCommand } from './commands/save.command';
import { SeedCommand } from './commands/seed.command';
import { InfoCommand } from './commands/info.command';
import { StatsCommand } from './commands/stats.command';

@Module({
  providers: [
    CommonService,
    LicenseCommand,
    DecryptCommand,
    EncryptCommand,
    DownloadCommand,
    UploadCommand,
    QueryCommand,
    SaveCommand,
    SeedCommand,
    InfoCommand,
    StatsCommand,
  ],
})
export class AppModule {}
