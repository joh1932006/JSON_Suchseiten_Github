import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JsonConfigEditorComponent } from './json-config-editor.component';

describe('JsonConfigEditorComponent', () => {
  let component: JsonConfigEditorComponent;
  let fixture: ComponentFixture<JsonConfigEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonConfigEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JsonConfigEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
