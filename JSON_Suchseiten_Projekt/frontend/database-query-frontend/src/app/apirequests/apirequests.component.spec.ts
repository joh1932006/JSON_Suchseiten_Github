import { ComponentFixture, TestBed } from '@angular/core/testing';

import { APIRequestsComponent } from './apirequests.component';

describe('APIRequestsComponent', () => {
  let component: APIRequestsComponent;
  let fixture: ComponentFixture<APIRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [APIRequestsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(APIRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
