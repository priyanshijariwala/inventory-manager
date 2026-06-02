import { BadRequestException, Body, Controller, Delete, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

const profileImageDestination = join(__dirname, '..', '..', 'uploads', 'profile-images');
if (!fs.existsSync(profileImageDestination)) {
  fs.mkdirSync(profileImageDestination, { recursive: true });
}

const profileStorage = diskStorage({
  destination: profileImageDestination,
  filename: (_req, file, callback) => {
    const fileExtension = extname(file.originalname).toLowerCase();
    const fileName = `${randomBytes(8).toString('hex')}${fileExtension}`;
    callback(null, fileName);
  },
});

const imageFileFilter = (_req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedTypes = /image\/(jpeg|png|gif|webp|bmp)/i;
  if (!allowedTypes.test(file.mimetype)) {
    return callback(new BadRequestException('Only image files are allowed.'), false);
  }
  callback(null, true);
};

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @Get()
  @Roles(UserRole.MANAGER)
  findAll() {
    return this.usersService.findAll();
  }

  @ApiBearerAuth()
  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.findProfileById(user.sub);
  }

  @ApiBearerAuth()
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: profileStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Profile image file is required.');
    }
    const profileImageUrl = `/api/uploads/profile-images/${file.filename}`;
    return this.usersService.updateProfileImage(user.sub, profileImageUrl);
  }

  @ApiBearerAuth()
  @Delete('me/avatar')
  removeAvatar(@CurrentUser() user: JwtPayload) {
    return this.usersService.clearProfileImage(user.sub);
  }
}
