import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  constructor(private toastService: ToastService) {}

  showDemoMessage(event: Event): void {
    event.preventDefault(); 
    this.toastService.showError('Ez az oldal a szakdolgozati demó verzióban nem elérhető.'); 
  }
  
  currentYear = new Date().getFullYear();
}
