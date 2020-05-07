import { Component, OnInit, Injector, ViewChild, OnDestroy } from '@angular/core';
import { BaseImports } from "@libs/base-imports";
import { Subscription } from 'rxjs';
import { FormGroup, Validators } from '@angular/forms';
import { AccountViewDto } from '@dtos/accounts/account-view.dto';
import { DropdownItemDo } from '@dos/dropdown-item.do';
import { AccountListFilterDo } from '@dos/filters/account-list-filter.do';
import { AccountDialogComponent } from '@components/dialogs/account-dialog/account-dialog.component';
import { Table } from 'primeng/table/table';

@Component({
  selector: 'accounts',
  templateUrl: './accounts.page.html',
  styleUrls: ['./accounts.page.scss'],
})
export class AccountsPage extends BaseImports implements OnInit, OnDestroy {
  accounts: AccountViewDto[]
  accountTypes: DropdownItemDo[];
  filter: AccountListFilterDo;
  showDialog: boolean;
  accountToEdit: AccountViewDto;
  @ViewChild('accountDialog', { static: false }) accountDialog: AccountDialogComponent;
  @ViewChild('accountsTable', { static: true }) table: Table;
  subscriptions: Subscription[];
  constructor(private injector: Injector) {
    super(injector);
    this.accounts = [];
    this.accountTypes = [];
    this.showDialog = false;
    this.accountToEdit = null;
    this.filter = new AccountListFilterDo();
    this.subscriptions = [];
  }
  
  ngOnInit(): void {
    this.load();

    var subscription = this.webapiCommonService.getAccountTypes().subscribe(res => {
      this.accountTypes.push(this.commonService.getDefaultDropdownItem());
      this.accountTypes = this.accountTypes.concat(res.map(x => {
        var result = new DropdownItemDo();
        result.label = x.Caption;
        result.value = x.Id;
        return result;
      }));
      this.filter.AccountTypeId = this.accountTypes[0].value;
    });
    this.subscriptions.push(subscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(x => { x.unsubscribe();});
  }

  load() {
    var subscription = this.webapiAccountsService.getAccountList(this.filter).subscribe((res) => {
      this.accounts = res;
    });
    this.subscriptions.push(subscription);
  }

  search() {
    this.table.reset();
    this.load()
  }

  clearFilter() {
    this.filter = new AccountListFilterDo();
  }

  removeAccount(accountId: number) {
    this.primengConfirmationService.confirm({
      message: 'Are you sure that you want to remove account?',
      accept: () => {
        var subscription = this.webapiAccountsService.removeAccount(accountId).subscribe((res) => {
          if (res) {
            this.search();
            this.commonService.showToastSuccess("Account removed successfully");
          }
        });
        this.subscriptions.push(subscription);
      }
    })
  }

  dialogClosed() {
    this.showDialog = false;
  }

  addNewAccountOld() {
    this.routerService.navigate('create-account');
  }

  addNewAccount() {
    this.accountDialog.create();
  }

  editAccount(account: AccountViewDto) {
      this.accountDialog.update(account);
  }
}
