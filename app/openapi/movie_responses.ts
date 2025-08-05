import { ApiProperty } from '@foadonis/openapi/decorators'
import PaginatedResponse from './schemas/paginated_response.js'

export class MovieResponse {
  @ApiProperty()
  declare id: number

  @ApiProperty()
  declare title: string

  @ApiProperty()
  declare year: number
}

export class PaginatedMovieResponse extends PaginatedResponse(MovieResponse) {}
