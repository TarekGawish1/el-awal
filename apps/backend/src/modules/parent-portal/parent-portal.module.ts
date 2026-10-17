import { Module } from '@nestjs/common';
import { ParentPortalController } from './controllers/parent-portal.controller';
import { ParentPortalService } from './services/parent-portal.service';
import { ParentChildrenService } from './services/parent-children.service';
import { ParentOverviewService } from './services/parent-overview.service';
import { ParentFeedService } from './services/parent-feed.service';

@Module({
  controllers: [ParentPortalController],
  providers: [
    ParentPortalService,
    ParentChildrenService,
    ParentOverviewService,
    ParentFeedService,
  ],
  exports: [
    ParentPortalService,
    ParentChildrenService,
    ParentOverviewService,
    ParentFeedService,
  ],
})
export class ParentPortalModule {}
