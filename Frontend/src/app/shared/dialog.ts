import { AfterViewInit, Component, ElementRef, output, viewChild } from '@angular/core';
import { Icon } from './icon';
@Component({
  selector: 'ft-dialog',
  imports: [Icon],
  template: `<dialog #dialog (cancel)="onCancel($event)">
    <div class="dialog-top">
      <ng-content select="[dialog-title]" /><button
        type="button"
        class="icon-button"
        aria-label="Close dialog"
        (click)="closed.emit()"
      >
        <ft-icon name="close" />
      </button>
    </div>
    <ng-content />
  </dialog>`,
})
export class Dialog implements AfterViewInit {
  closed = output();
  element = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  ngAfterViewInit() {
    const dialog = this.element().nativeElement;
    const heading = dialog.querySelector('[dialog-title]');
    if (heading) {
      const id = 'dialog-' + crypto.randomUUID();
      heading.id = id;
      dialog.setAttribute('aria-labelledby', id);
    }
    dialog.showModal();
  }
  onCancel(event: Event) {
    event.preventDefault();
    this.closed.emit();
  }
}
