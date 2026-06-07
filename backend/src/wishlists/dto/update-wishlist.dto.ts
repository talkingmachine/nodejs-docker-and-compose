import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class UpdateWishlistDto {
  @IsOptional()
  @IsString()
  @Length(1, 250)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1500)
  description?: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  itemsId?: number[];
}
