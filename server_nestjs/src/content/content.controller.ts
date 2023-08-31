import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {

    constructor(private contentService: ContentService) {}
}
