variable "region" {
  description = "Region of the inventoried shared infrastructure."
  type        = string
}

variable "compartment_id" {
  description = "Existing compartment; this root does not manage IAM or compartments."
  type        = string
  sensitive   = true
}

variable "resource_metadata" {
  description = "Exact existing display names and tags, keyed by the resource names in main.tf and network.tf."
  type = map(object({
    display_name  = string
    defined_tags  = map(string)
    freeform_tags = map(string)
  }))
  sensitive = true
}

variable "instance" {
  description = "Existing shared instance settings from the private inventory, including its original image source."
  type = object({
    availability_domain = string
    fault_domain        = string
    shape               = string
    ocpus               = number
    memory_in_gbs       = number
    image_id            = string
    metadata            = map(string)
    extended_metadata   = map(string)
    vnic_display_name   = string
    hostname_label      = string
    private_ip          = string
    vnic_defined_tags   = map(string)
    vnic_freeform_tags  = map(string)
    agent_plugins       = map(string)
  })
  sensitive = true
}

variable "boot_volume_id" {
  description = "Existing data-bearing boot volume; read-only, never independently cloned or attached."
  type        = string
  sensitive   = true
}

variable "primary_private_ip_id" {
  description = "Existing primary private IP to which the reserved public IP is assigned."
  type        = string
  sensitive   = true
}

variable "vcn" {
  description = "Existing IPv4 VCN settings."
  type = object({
    cidr_blocks = list(string)
    dns_label   = string
  })
  sensitive = true
}

variable "subnet" {
  description = "Existing regional subnet settings."
  type = object({
    cidr_block = string
    dns_label  = string
  })
  sensitive = true
}

variable "ingress_rules" {
  description = "All existing ingress rules, including rules used by the other applications."
  type = list(object({
    protocol    = string
    source      = string
    source_type = string
    stateless   = bool
    description = optional(string)
    icmp_options = optional(object({
      type = number
      code = optional(number)
    }))
    tcp_options = optional(object({
      min = number
      max = number
    }))
    udp_options = optional(object({
      min = number
      max = number
    }))
  }))
  sensitive = true
}

variable "egress_rules" {
  description = "Existing unrestricted-protocol egress rules from the inventory."
  type = list(object({
    protocol         = string
    destination      = string
    destination_type = string
    stateless        = bool
    description      = optional(string)
  }))
  sensitive = true
}

variable "internet_route" {
  description = "Existing default IPv4 route to the inventoried Internet Gateway."
  type = object({
    destination      = string
    destination_type = string
    route_type       = string
    description      = optional(string)
  })
  sensitive = true
}

variable "dhcp_search_domains" {
  description = "Existing DHCP search domains, retained verbatim in private inputs."
  type        = list(string)
  sensitive   = true
}
