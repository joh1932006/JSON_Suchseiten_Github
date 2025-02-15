import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SqlResultsComponent } from './sql-results.component';

describe('SqlResultsComponent', () => {
  let component: SqlResultsComponent;
  let fixture: ComponentFixture<SqlResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SqlResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
