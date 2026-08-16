import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiPropertyOptional({ description: 'Cursor to fetch the next page' })
  nextCursor?: string | null;

  @ApiPropertyOptional({ description: 'Cursor to fetch the previous page' })
  prevCursor?: string | null;

  @ApiProperty({ description: 'Whether additional pages exist' })
  hasMore: boolean;

  @ApiProperty({ description: 'Requested limit per page' })
  limit: number;

  @ApiPropertyOptional({ description: 'Total record count if calculated' })
  total?: number;
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Operation success indicator', default: true })
  success: boolean;

  @ApiProperty({ description: 'Payload data' })
  data: T;

  @ApiPropertyOptional({ description: 'Pagination or auxiliary metadata', type: PaginationMetaDto })
  meta?: PaginationMetaDto;

  @ApiProperty({ description: 'ISO8601 response generation timestamp' })
  timestamp: string;
}

export class ApiErrorDto {
  @ApiProperty({ default: false })
  success: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  error: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  message: string | string[];

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  path: string;

  @ApiPropertyOptional()
  correlationId?: string;
}
