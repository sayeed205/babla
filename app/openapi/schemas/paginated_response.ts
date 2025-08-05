import { ApiProperty } from '@foadonis/openapi/decorators'

export class PaginatedResponseMeta {
  @ApiProperty()
  declare total: number

  @ApiProperty()
  declare perPage: number

  @ApiProperty()
  declare currentPage: number

  @ApiProperty()
  declare lastPage: number

  @ApiProperty()
  declare firstPage: number

  @ApiProperty()
  declare firstPageUrl: string

  @ApiProperty()
  declare lastPageUrl: string

  @ApiProperty({ required: false })
  declare nextPageUrl?: string

  @ApiProperty({ required: false })
  declare previousPageUrl?: string
}

export default function PaginatedResponse<TItem extends object>(
  Item: new (...args: any[]) => TItem
) {
  abstract class Pagination {
    @ApiProperty()
    declare meta: PaginatedResponseMeta

    @ApiProperty({ type: [Item] })
    declare data: TItem[]
  }

  return Pagination
}
