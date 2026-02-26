import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('分类')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: '创建分类', description: '创建新的收支分类' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(user.id, dto);
  }

  @ApiOperation({
    summary: '获取分类列表',
    description: '获取所有分类（包含系统默认和用户自定义）',
  })
  @ApiQuery({
    name: 'ledgerId',
    required: false,
    description: '账本ID，不传则返回所有分类',
    type: Number,
  })
  @ApiResponse({ status: 200, description: '返回分类列表' })
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('ledgerId', new ParseIntPipe({ optional: true })) ledgerId?: number,
  ) {
    return this.categoryService.findAll(user.id, ledgerId);
  }
}
