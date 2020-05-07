import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { ConnectionService } from '@services/connection.service';
import { AccountNavigationDto } from '@dtos/accounts/account-navigation.dto';
import { AccountCreateDto } from '@dtos/accounts/account-create.dto';
import { AccountViewDto } from '@dtos/accounts/account-view.dto';
import { CommonService } from '@services/common.service';
import { AccountListFilterDo } from '@dos/filters/account-list-filter.do';
import { AccountsSearchFilterDo } from '@dos/filters/accounts-search-filter.do';
import { AccountUpdateDto } from '@dtos/accounts/account-update.dto';
import { RequestOptions } from '@angular/http';

@Injectable()
export class WebapiAccountsService {
  connectionService: ConnectionService;
  commonService:CommonService;
  controllerName = "Accounts";
  constructor(private injector: Injector) {
    this.connectionService = injector.get(ConnectionService);
    this.commonService = injector.get(CommonService);
  }

  searchAccounts(filter: AccountsSearchFilterDo): Observable<AccountNavigationDto[]> {
    return this.connectionService.get(this.controllerName + "/Search" + this.connectionService.generateQueryParamsFromFilter(filter));
  }

  createAccounts(data: AccountCreateDto): Observable<boolean> {
    return this.connectionService.post(this.controllerName, data);
  }

  updateAccounts(accountId: number, data: AccountUpdateDto): Observable<boolean> {
    return this.connectionService.put(this.controllerName + "/" + accountId, data);
  }

  getAccountList(filter: AccountListFilterDo, showLoader = true): Observable<AccountViewDto[]> {
    return this.connectionService.get(this.controllerName + this.connectionService.generateQueryParamsFromFilter(filter), new RequestOptions(), showLoader);
  }

  getAccountsForTarget(filter: AccountListFilterDo): Observable<AccountViewDto[]> {
    return this.connectionService.get(this.controllerName + "/ForTarget" + this.connectionService.generateQueryParamsFromFilter(filter));
  }

  removeAccount(accountId: number): Observable<boolean> {
    return this.connectionService.delete(this.controllerName + "/" + accountId);
  }
}
