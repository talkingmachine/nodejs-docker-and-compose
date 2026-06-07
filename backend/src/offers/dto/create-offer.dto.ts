import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateOfferDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsNumber()
  itemId: number;
}
