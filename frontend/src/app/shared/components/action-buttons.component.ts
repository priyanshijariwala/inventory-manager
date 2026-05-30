import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-action-buttons',
  standalone: true,
  template: `
    <div style="display: flex; gap: 0.5rem; align-items: center; height: 100%;">
      <button 
        (click)="onEdit()" 
        title="Edit" 
        style="background: none; border: none; cursor: pointer; padding: 0.5rem; color: #1976d2; font-weight: 500; font-size: 14px;"
      >
        ✎ Edit
      </button>
      <button 
        (click)="onDelete()" 
        title="Delete" 
        style="background: none; border: none; cursor: pointer; padding: 0.5rem; color: #d32f2f; font-weight: 500; font-size: 14px;"
      >
        🗑 Delete
      </button>
    </div>
  `,
})
export class ActionButtonsComponent {
  @Input() data: any;
  @Input() onEditCallback: ((data: any) => void) | null = null;
  @Input() onDeleteCallback: ((id: string) => void) | null = null;

  onEdit() {
    if (this.onEditCallback && this.data) {
      this.onEditCallback(this.data);
    }
  }

  onDelete() {
    if (this.onDeleteCallback && this.data?.id) {
      this.onDeleteCallback(this.data.id);
    }
  }
}
