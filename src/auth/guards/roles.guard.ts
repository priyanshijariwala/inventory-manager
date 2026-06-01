import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<any>();
    const userRole: UserRole | undefined = request.user?.role;

    if (!userRole) {
      throw new ForbiddenException('Your account does not have permission to perform this action.');
    }

    if (requiredRoles.includes(userRole)) {
      return true;
    }

    const path = request.url || request.originalUrl || '';
    const message = this.getForbiddenMessage(path);
    throw new ForbiddenException(message);
  }

  private getForbiddenMessage(path: string): string {
    if (path.startsWith('/products')) {
      return 'Staff users are not allowed to add, update, or delete products.';
    }

    if (path.startsWith('/categories')) {
      return 'Staff users are not allowed to add, update, or delete categories.';
    }

    if (path.startsWith('/stock-movements/report')) {
      return 'Staff users are not allowed to access stock reports.';
    }

    return 'Your account does not have permission to perform this action.';
  }
}
