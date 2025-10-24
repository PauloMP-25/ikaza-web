import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar-links',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar-links.html',
  styleUrls: ['./navbar-links.scss']
})
export class NavbarLinksComponent { }
