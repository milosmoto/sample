import { Injector, Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { Http, RequestOptions, Response } from '@angular/http';
import { map, catchError, flatMap } from 'rxjs/operators';
import { filter } from "rxjs/internal/operators/filter";
import { take } from "rxjs/internal/operators/take";
import { switchMap } from "rxjs/internal/operators/switchMap";
//Constants
import { Constants } from '@app/app.constants';
//Services
import { AuthenticationService } from "@services/authentication.service";
import { CommonService } from "@services/common.service";
import { RouterService } from '@services/router.service';
import { LoggerService } from '@services/logger.service';
//Dtos
import { ResponseTemplateDto } from '@dtos/response-template.dto';
//Dos
import { FilterBaseDo } from '@dos/filter-base.do';

@Injectable()
export class ConnectionService {
    baseUrl: string;
    apiVersion: string;
    httpService: Http;
    authenticationService: AuthenticationService;
    commonService: CommonService;
    routerService: RouterService;
    loggerService: LoggerService;
    refreshTokenInProgress: boolean;
    refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    constructor(private injector: Injector) {
        this.httpService = this.injector.get(Http);
        this.authenticationService = this.injector.get(AuthenticationService);
        this.commonService = this.injector.get(CommonService);
        this.baseUrl = Constants.API_ENDPOINT;
        this.apiVersion = Constants.API_VERSION;
        this.routerService = this.injector.get(RouterService);
        this.loggerService = this.injector.get(LoggerService);
        this.refreshTokenInProgress = false;
    }

    get(requestUrl: string, requestOptions = new RequestOptions(), showLoader = true): Observable<any> {
        var _headers = this.authenticationService.generateRequestHeaders();
        requestOptions = new RequestOptions({ headers: _headers }).merge(requestOptions);

        if (showLoader) {
            this.commonService.showLoader();
        }

        return this.httpService.get(this.baseUrl + this.apiVersion + requestUrl, requestOptions).pipe(
            map((res: Response) => { return this.mapData(res, showLoader); }),
            catchError((err) => { return this.handleError('get', err, requestUrl, showLoader, err, requestOptions); }));
    }

    post(requestUrl: string, data: any, requestOptions = new RequestOptions(), showLoader = true): Observable<any> {
        var _headers = this.authenticationService.generateRequestHeaders();
        requestOptions = new RequestOptions({ headers: _headers }).merge(requestOptions);

        if (showLoader) {
            this.commonService.showLoader();
        }

        return this.httpService.post(this.baseUrl + this.apiVersion + requestUrl, data, requestOptions).pipe(
            map((res: Response) => { return this.mapData(res, showLoader); }),
            catchError((err) => { return this.handleError('post', err, requestUrl, showLoader, err, requestOptions); }));
    }

    delete(requestUrl: string, requestOptions = new RequestOptions(), showLoader = true): Observable<any> {
        var _headers = this.authenticationService.generateRequestHeaders();
        requestOptions = new RequestOptions({ headers: _headers }).merge(requestOptions);

        if (showLoader) {
            this.commonService.showLoader();
        }

        return this.httpService.delete(this.baseUrl + this.apiVersion + requestUrl, requestOptions).pipe(
            map((res: Response) => { return this.mapData(res, showLoader); }),
            catchError((err) => { return this.handleError('dellete', err, requestUrl, showLoader, err, requestOptions); }));
    }

    put(requestUrl: string, data: any, requestOptions = new RequestOptions(), showLoader = true): Observable<any> {
        var _headers = this.authenticationService.generateRequestHeaders();
        requestOptions = new RequestOptions({ headers: _headers }).merge(requestOptions);

        if (showLoader) {
            this.commonService.showLoader();
        }

        return this.httpService.put(this.baseUrl + this.apiVersion + requestUrl, data, requestOptions).pipe(
            map((res: Response) => { return this.mapData(res, showLoader); }),
            catchError((err) => { return this.handleError('put', err, requestUrl, showLoader, err, requestOptions); }));
    }

    mapData(res: Response, showLoader: boolean) {
        if (showLoader) {
            this.commonService.hideLoader();
        }

        let body: ResponseTemplateDto<any> = new ResponseTemplateDto<any>();
        if (res.text()) {
            body = res.json();
        }

        if(body.IsSuccess) {
            return body.Data;
        }         
        throw res;
    }

    private handleError(requestType: string, error: Response | any, requestUrl: string, showLoader: boolean, requestData?: any, requestOptions?: RequestOptions) {
        if (showLoader) {
            this.commonService.hideLoader();
        }
        let errBody: ResponseTemplateDto<any>;
        if (error instanceof Response) {
            if (error.status == 401) {
                if (this.refreshTokenInProgress) {
                    return this.refreshTokenSubject
                      .pipe(filter(x => x != null))
                      .pipe(take(1))
                      .pipe(switchMap(() => { return this.reprocessRequest(requestType, requestUrl, showLoader, requestData, null); }));
                }                
            
                this.refreshTokenInProgress = true;
                this.refreshTokenSubject.next(null);
                return this.authenticationService.refreshToken().pipe(
                    flatMap((res: any) => {
                        this.refreshTokenInProgress = false;
                        this.refreshTokenSubject.next("refreshtoken");
                        return this.reprocessRequest(requestType, requestUrl, showLoader, requestData, null)
                    }),
                    catchError((error: any) => { this.refreshTokenInProgress = false; return throwError("Unauthorized"); })
                );
            }

            if (error.status == 403) {
                return this.authenticationService.logout().pipe(
                    flatMap((res: any) => {
                        this.routerService.navigate("sign-in");
                        this.commonService.showToastError("you_do_not_have_permision_for_access");
                        return throwError("you_do_not_have_permision_for_access");
                    })
                )
            }

            errBody = error.json();
            
            this.loggerService.errorObject(errBody, requestType + JSON.stringify(requestUrl) + JSON.stringify(requestData));
            if (error.status != 401 && (error.status >= 400 && error.status <= 500)) {
                this.commonService.showToastError(errBody.ErrorMessage);
            }

            if (error.status == 200) {
                if (!errBody.Data) {
                    this.commonService.showToastError(errBody.ErrorMessage);
                    return throwError(errBody.Data);
                } else {
                    return throwError(error);
                }
            }
        } else {
            errBody = error.message ? error.message : error.toString();
        }
        this.loggerService.errorObject(errBody, requestType + JSON.stringify(requestUrl) + JSON.stringify(requestData));
        return throwError(errBody);
    }

    private reprocessRequest(requestType: string, requestUrl: string, showLoader: boolean, requestData?: any, requestOptions?: RequestOptions): Observable<any> {
        if (requestType == 'get') {
            return this.get(requestUrl, requestOptions, showLoader);
        } else if (requestType == 'post') {
            return this.post(requestUrl, requestData, requestOptions, showLoader);
        } else if (requestType == 'put') {
            return this.put(requestUrl, requestData, requestOptions, showLoader);
        } else {
            return this.delete(requestUrl, requestOptions, showLoader);
        }
    }

    generateQueryParamsFromFilter(filter: FilterBaseDo) {
        let filterKeys = Object.entries(filter);
        let toReturn = "?";
        filterKeys.forEach(filter => {
            if (!filter[1] || filter[1].length == 0) {
                return;
            }

            var value = filter[1];
            if (filter[1] instanceof Date) {
                value = (<Date>value).toISOString();
            } else if (filter[1] instanceof Array) {
                value = [];
                filter[1].forEach(item => {
                    value.push(item);
                });
            }
            if(value instanceof Array) {
                value.forEach(v => {
                    toReturn += "" + filter[0].charAt(0).toLowerCase() + filter[0].slice(1) + "=" + v + "&";
                });
            } else {
                if(String(value).trim().length > 0) {
                    toReturn += "" + filter[0].charAt(0).toLowerCase() + filter[0].slice(1) + "=" + value + "&";
                }
            }
        });
        toReturn = toReturn.slice(0, toReturn.length - 1);
        return toReturn;
    }
}
