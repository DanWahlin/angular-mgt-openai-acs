import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CallClient, CallAgent, Call } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { Subscription } from 'rxjs';
import { DataService } from '../core/data.service';
import { AcsUser } from '../shared/interfaces';
import { AcsService } from '../core/acs.service';

declare const ACS_PHONE_NUMBER: string;
declare const ACS_CONNECTION_STRING: string;

@Component({
  selector: 'app-phone-call',
  templateUrl: './phone-call.component.html',
  styleUrls: ['./phone-call.component.scss']
})
export class PhoneCallComponent implements OnInit, OnDestroy {
  inCall = false;
  call: Call | undefined;
  callAgent: CallAgent | undefined;
  fromNumber = ACS_PHONE_NUMBER; // From .env file
  dialerVisible = false;
  numbers: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '0', ' '];
  cursorPosition = 0;
  subscriptions: Subscription[] = [];

  @Input() customerPhoneNumber = '';
  @Output() hangup = new EventEmitter();

  @ViewChild('phoneInput', { static: false }) phoneInput: ElementRef | null = null;
  @ViewChild('dialer', { static: false }) dialer: ElementRef | null = null;

  constructor(private acsService: AcsService) { }

  async ngOnInit() {
    if (ACS_CONNECTION_STRING) {
      this.subscriptions.push(
        this.acsService.getAcsToken().subscribe(async (user: AcsUser) => {
          const callClient = new CallClient();
          const tokenCredential = new AzureCommunicationTokenCredential(user.token);
          this.callAgent = await callClient.createCallAgent(tokenCredential);
        })
      );
    }
  }

  showDialer() {
    this.dialerVisible = true;
    this.cursorPosition = this.phoneInput?.nativeElement.selectionStart;
  }

  addNumber(num: string): void {
    if (this.phoneInput?.nativeElement.value.length < 12) { // +1231231234 - US phone number format
      const position = this.cursorPosition !== undefined ? this.cursorPosition : this.customerPhoneNumber.length;
      this.customerPhoneNumber = this.customerPhoneNumber.slice(0, position) + num + this.customerPhoneNumber.slice(position);
      this.cursorPosition += 1;
    }
  }

  startCall() {
    this.call = this.callAgent?.startCall(
      [{ phoneNumber: this.customerPhoneNumber }], {
      alternateCallerId: { phoneNumber: this.fromNumber }
    });
    console.log('Calling: ', this.customerPhoneNumber);
    console.log('Call id: ', this.call?.id);
    this.inCall = true;
  }

  endCall() {
    if (this.call) {
      this.call.hangUp({ forEveryone: true });
      this.call = undefined;
      this.inCall = false;
    }
    else {
      this.hangup.emit();
    }
  }

  // Handle closing content options menu when they click anywhere in the document
  @HostListener('document:click', ['$event'])
  documentClick(e: Event) {
    const targetElement = e.target as HTMLElement;
    if (this.dialerVisible && targetElement !== this.phoneInput?.nativeElement &&
      (!this.dialer || !this.dialer.nativeElement.contains(targetElement))
    ) {
      this.dialerVisible = false;
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}
