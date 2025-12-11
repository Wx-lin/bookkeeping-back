import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    // 无论是因为有错误(err)，还是没有用户(user)，都视为未登录
    if (err || !user) {
      // 可以根据 info 或 err 的内容来区分是 "未提供token" 还是 "token过期"
      // 但为了简单统一，直接返回通用消息
      throw new UnauthorizedException('请先登录或登录已过期');
    }
    return user;
  }
}
