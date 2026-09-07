import { Module } from '@nestjs/common';
import { TestimonialsController } from './controllers/testimonials.controller';
import { TestimonialsService } from './services/testimonials.service';

@Module({
  controllers: [TestimonialsController],
  providers: [TestimonialsService],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
