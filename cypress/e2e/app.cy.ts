describe('Authentication', () => {
  it('should login', () => {
    cy.visit('/');
    cy.url().should('include', '/login');

    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('admin');

    cy.get('button[type="submit"]').click();

    cy.url().should('eq', Cypress.config().baseUrl + '/');

    cy.contains("Sign out").click();
    cy.url().should('eq', Cypress.config().baseUrl + '/login');

    cy.visit('/');
    cy.url().should('include', '/login');
  });
});
