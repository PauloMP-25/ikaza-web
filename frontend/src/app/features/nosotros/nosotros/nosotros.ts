import { Component } from '@angular/core';
import { AboutIntroComponent } from '../about-intro/about-intro';
import { AboutMissionComponent } from '../about-mission/about-mission';
import { AboutGoalsComponent } from '../about-goals/about-goals';
import { AboutContactModalComponent } from '../about-contact-modal/about-contact-modal';

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [
    AboutIntroComponent,
    AboutMissionComponent,
    AboutGoalsComponent,
    AboutContactModalComponent
  ],
  templateUrl: './nosotros.html',
  styleUrls: ['./nosotros.scss']
})
export class NosotrosComponent { }
