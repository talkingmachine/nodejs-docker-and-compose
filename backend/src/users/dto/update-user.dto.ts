import { IsEmail, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 30)
  username?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  about?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
