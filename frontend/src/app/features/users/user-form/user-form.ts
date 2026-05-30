import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../../../shared/services/user.service';
import { ToastService } from '../../../shared/services/toast.service';
import { User } from '../../../shared/models/user.model';
import { AutoFocusDirective } from '../../../shared/directives/auto-focus.directive';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    AutoFocusDirective
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private dialogRef = inject(MatDialogRef<UserFormComponent>);

  @Inject(MAT_DIALOG_DATA) data: { user?: User } = {};

  form!: FormGroup;
  loading = false;
  isEditMode = false;

  ngOnInit() {
    this.isEditMode = !!this.data.user;
    this.form = this.fb.group({
      email: [
        { value: this.data.user?.email || '', disabled: this.isEditMode },
        [Validators.required, Validators.email]
      ],
      role: [this.data.user?.role || 'user', Validators.required],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const formValue = { ...this.form.value };
    if (this.isEditMode) {
      delete formValue.email;
    }

    const operation = this.isEditMode
      ? this.userService.updateUser(this.data.user!.id!, formValue)
      : this.userService.createUser(this.form.value);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.toast.success(`User ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.toast.error(error, 'Failed to save user');
      }
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
