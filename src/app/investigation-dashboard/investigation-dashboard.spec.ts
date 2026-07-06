import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigationDashboardComponent } from './investigation-dashboard.component';

describe('InvestigationDashboardComponent', () => {
  let component: InvestigationDashboardComponent;
  let fixture: ComponentFixture<InvestigationDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigationDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvestigationDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
