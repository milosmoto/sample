import { Injectable, Injector } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { Observable, of, throwError } from "rxjs";
import { map, catchError } from 'rxjs/operators';
import { concatMap } from "rxjs/internal/operators/concatMap";
import { Constants } from '@app/app.constants';
import { SignInDto } from "@dtos/sign-in/sign-in.dto";
import { AuthenticationResponseDto } from "@dtos/authentication-response/authentication-response.dto";
import { ResponseTemplateDto } from '@dtos/response-template.dto';
import { CommonService } from '@services/common.service';
import { SharedService } from '@services/shared.service';
import { RouterService } from '@services/router.service';
import { UserProfileViewDto } from '@dtos/users/user-profile-view.dto';

@Injectable()
export class AuthenticationService {
    key: string;
    commonService: CommonService;

    constructor(
        private httpService: Http,
        private injector: Injector,
        private sharedService: SharedService,
        private routerService: RouterService
    ) {
        this.key = "login-data";
        this.commonService = this.injector.get(CommonService);
    }

    login(signIn: SignInDto) {
      let url = Constants.API_ENDPOINT + "connect/token";
      let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
      let options = new RequestOptions({ headers: headers });
      let body = "username=" + signIn.Email + "&password=" + signIn.Password + "&grant_type=password&client_id=" + Constants.CLIENT_ID + "&client_secret=" + Constants.CLIENT_SECRETS + "&scope=" + Constants.CLIENT_SCOPE;
      this.commonService.showLoader();
      return this.httpService.post(url, body, options).pipe(
      map((res: Response) => {
        localStorage.setItem("email", signIn.Email);
        return this.mapData(res);;
      }),
      catchError((err) => { return this.mapError(err); })
      ).pipe(concatMap((res) => {
          this.commonService.showLoader();
          var _headers = this.generateRequestHeaders();
          var requestOptions = new RequestOptions({ headers: _headers });
          return this.httpService.get(Constants.API_ENDPOINT + Constants.API_VERSION + "Users/Profile", requestOptions).pipe(map((res_profile: Response) => {
            this.setProfileData(res_profile);
            this.sharedService.broadcast(Constants.EV_LOGIN_STATE_CHANGED, true);
          }));
      }));
    }

    private mapData(res: Response) {
      this.commonService.hideLoader();
      localStorage.setItem(this.key, JSON.stringify(res.json()));
      let body;
      if (res.text()) {
          body = res.json();
      }
      return body || {};
    }

    private mapError(res: Response | any) {
      this.commonService.hideLoader();
      let errMsg: string;

      if (res instanceof Response) {
          const body = res.text() || '';
          errMsg = body;
      } else {
          errMsg = res.message ? res.message : res.toString();
      }

      if (errMsg.indexOf('"isTrusted": true') > -1) {
          this.commonService.showToastError("webapi_offline");
      }

      if (res.status == 400) {
          this.commonService.showToastError(JSON.parse(errMsg).error_description);
      }

      return throwError(res.json());
    }

    logout(): Observable<boolean> {
      localStorage.removeItem('firstname');
      localStorage.removeItem('lastname');
      localStorage.removeItem('email');
      localStorage.removeItem(this.key);
      this.sharedService.broadcast(Constants.EV_LOGIN_STATE_CHANGED, false);
      //This should be replaced with real api call to invalidate tokens
      return new Observable(observer => {
          observer.next(true);
      });
    }

    getAccessToken(): string {
      var data = <AuthenticationResponseDto>JSON.parse(localStorage.getItem(this.key));
      if (data == null || data == undefined) {
          return null;
      }
      return data.access_token;
    }

    getRefreshToken(): string {
      var data = <AuthenticationResponseDto>JSON.parse(localStorage.getItem(this.key));
      if (data == null || data == undefined) {
          return null;
      }
      return data.refresh_token;
    }

    refreshToken(): Observable<any> {
      let accessToken = this.getAccessToken();
      if (accessToken == '' || accessToken == null || accessToken == undefined) return of(true);
      let options = new RequestOptions({ headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' }) });
      let body = "grant_type=refresh_token&client_id=" + Constants.CLIENT_ID + "&client_secret=" + Constants.CLIENT_SECRETS + "&refresh_token=" + this.getRefreshToken();
      return this.httpService.post(Constants.API_ENDPOINT + "connect/token", body, options).pipe(
          map((res: Response) => { return this.mapData(res); }),
          catchError((err) => {
              return throwError("Problem with refresh token."); 
          })
      ).pipe(concatMap((res) => {
          this.commonService.showLoader();
          var _headers = this.generateRequestHeaders();
          var requestOptions = new RequestOptions({ headers: _headers });
          return this.httpService.get(Constants.API_ENDPOINT + Constants.API_VERSION + "Users/Profile", requestOptions).pipe(map((res_profile: Response) => {
              //this.setProfileData(res_profile);
          }));
      }));;
    }

    setProfileData(profile: Response) {
      var userInfo = <ResponseTemplateDto<UserProfileViewDto>>profile.json();
      if (userInfo.IsSuccess) {
        localStorage.setItem("firstname", userInfo.Data.Firstname);
        localStorage.setItem("lastname", userInfo.Data.Lastname);
        localStorage.setItem("email", userInfo.Data.Email);
        }
        this.commonService.hideLoader();
    }

    isAuthenticated(): boolean {
      var data = <AuthenticationResponseDto>JSON.parse(localStorage.getItem(this.key));
      if (data == null || data == undefined) {
          return false;
      }

      if (data.access_token == null || data.access_token == undefined) {
          return false;
      }
      return true;
    }

    generateRequestHeaders() {
      var headers = new Headers({ 'Content-Type': 'application/json' });
      headers.append('Authorization', 'Bearer ' + this.getAccessToken());
      return headers;
    }

    getEmail() {
      var data = localStorage.getItem("email");
      if (data == null || data == undefined) {
          return null;
      }
      return data;
    }

  getFirstname() {
    var data = localStorage.getItem("firstname");
    if (data == null || data == undefined) {
      return null;
    }
    return data;
  }

  getLastname() {
    var data = localStorage.getItem("lastname");
    if (data == null || data == undefined) {
      return null;
    }
    return data;
  }
}
