import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { Role } from '../roles/role.entity';
import { RoleScreen } from '../role-screens/role-screen.entity';
import { Screen } from '../screens/screen.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermisosService } from './permisos.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    CategoriesModule,
    // Repositorios RBAC: el token embebe las pantallas del rol (role → role_screens → screens)
    TypeOrmModule.forFeature([Role, RoleScreen, Screen]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'SECRETO_SUPER_SEGURO'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PermisosService, JwtStrategy],
  exports: [AuthService, PermisosService, JwtStrategy, PassportModule],
})
export class AuthModule {}
