import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { version } from '../package.json';

async function bootstrap() {
  await CommandFactory.run(AppModule, {
    cliName: 'not3',
    version: version,
  });
}

bootstrap();
