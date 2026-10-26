import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class StudentRankingQueryDto {
  @ApiPropertyOptional({
    description:
      "Sort leaderboard by total active duration or total session visit count",
    enum: ["duration", "visits"],
    default: "duration",
  })
  @IsOptional()
  @IsIn(["duration", "visits"])
  sortBy?: "duration" | "visits" = "duration";

  @ApiPropertyOptional({
    description: "Predefined date range",
    enum: ["today", "week", "month", "year", "all", "custom"],
    default: "week",
  })
  @IsOptional()
  @IsIn(["today", "week", "month", "year", "all", "custom"])
  range?: "today" | "week" | "month" | "year" | "all" | "custom" = "week";

  @ApiPropertyOptional({ description: "Custom range start date (ISO string)" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Custom range end date (ISO string)" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: "Tenant ID filter" })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: "Number of top students to return",
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Role filter for engagement leaderboard: STUDENT or PARENT",
    enum: ["STUDENT", "PARENT", "ALL"],
    default: "STUDENT",
  })
  @IsOptional()
  @IsIn(["STUDENT", "PARENT", "ALL"])
  role?: "STUDENT" | "PARENT" | "ALL" = "STUDENT";
}

export class VisitorListQueryDto {
  @ApiPropertyOptional({
    description: "Predefined date range",
    enum: ["today", "week", "month", "year", "all", "custom"],
    default: "week",
  })
  @IsOptional()
  @IsIn(["today", "week", "month", "year", "all", "custom"])
  range?: "today" | "week" | "month" | "year" | "all" | "custom" = "week";

  @ApiPropertyOptional({ description: "Custom range start date (ISO string)" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Custom range end date (ISO string)" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: "Filter scope",
    enum: ["landing", "system", "all"],
    default: "all",
  })
  @IsOptional()
  @IsIn(["landing", "system", "all"])
  scope?: "landing" | "system" | "all" = "all";

  @ApiPropertyOptional({ description: "Tenant ID filter" })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: "Page number (1-based)", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 30;

  @ApiPropertyOptional({
    description: "Search keyword (name, phone, studentCode, city)",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Sort order: most visits or most recent",
    enum: ["recent", "visits"],
    default: "recent",
  })
  @IsOptional()
  @IsIn(["recent", "visits"])
  sortBy?: "recent" | "visits" = "recent";

  @ApiPropertyOptional({
    description: "Role filter for visitors: ALL, STUDENT, PARENT, GUEST, registered",
    enum: ["ALL", "STUDENT", "PARENT", "GUEST", "all", "students", "parents", "guests", "registered"],
    default: "ALL",
  })
  @IsOptional()
  @IsIn(["ALL", "STUDENT", "PARENT", "GUEST", "all", "students", "parents", "guests", "registered"])
  role?: string = "ALL";
}

export class PageEngagementPingDto {
  @ApiPropertyOptional({ description: "Anonymous device visitor ID" })
  @IsOptional()
  @IsString()
  visitorId?: string;

  @ApiProperty({ description: "Path of the page being viewed", example: "/" })
  @IsString()
  path!: string;

  @ApiProperty({
    description: "Active time spent on this page in seconds",
    example: 45,
  })
  @IsNumber()
  @Min(1)
  durationSeconds!: number;
}
